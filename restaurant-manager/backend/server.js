import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import db from "./db.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
    res.send("API Gestionale Ristorante attiva");
});

app.get("/reservations", async (req, res) => {
    try {
        const [rows] = await db.query(`
      SELECT
        r.id,
        r.reservation_date AS date,
        TIME_FORMAT(r.reservation_time, '%H:%i') AS time,
        r.people,
        r.room,
        r.table_number AS \`table\`,
        r.notes,
        r.status,
        c.first_name,
        c.last_name,
        c.phone,
        c.email
      FROM reservations r
      LEFT JOIN customers c ON c.id = r.customer_id
      ORDER BY r.reservation_date, r.reservation_time
    `);

        res.json(rows);
    } catch (error) {
        console.error("Errore lettura prenotazioni:", error);
        res.status(500).json({
            message: "Impossibile leggere le prenotazioni.",
        });
    }
});

app.post("/reservations", async (req, res) => {
    const {
        date,
        time,
        customer,
        phone,
        people,
        room,
        table,
        notes = "",
    } = req.body;

    if (
        !date ||
        !time ||
        !customer?.trim() ||
        !phone?.trim() ||
        !people ||
        !room ||
        !table
    ) {
        return res.status(400).json({
            message: "Compila tutti i campi obbligatori.",
        });
    }

    const peopleNumber = Number(people);
    const tableNumber = Number(table);

    if (
        !Number.isInteger(peopleNumber) ||
        peopleNumber < 1 ||
        !Number.isInteger(tableNumber)
    ) {
        return res.status(400).json({
            message: "Persone o numero tavolo non validi.",
        });
    }

    const connection = await db.getConnection();

    try {
        await connection.beginTransaction();

        const [tables] = await connection.query(
            `
        SELECT id, room, table_number, seats, status
        FROM tables
        WHERE table_number = ? AND room = ?
        LIMIT 1
      `,
            [tableNumber, room]
        );

        if (tables.length === 0) {
            await connection.rollback();

            return res.status(404).json({
                message: "Tavolo non trovato nella sala selezionata.",
            });
        }

        const selectedTable = tables[0];

        if (peopleNumber > selectedTable.seats) {
            await connection.rollback();

            return res.status(400).json({
                message: `Il tavolo ${tableNumber} ha solo ${selectedTable.seats} posti.`,
            });
        }

        const [conflicts] = await connection.query(
            `
        SELECT id
        FROM reservations
        WHERE reservation_date = ?
          AND reservation_time = ?
          AND table_number = ?
          AND status NOT IN ('cancelled', 'completed')
        LIMIT 1
      `,
            [date, time, tableNumber]
        );

        if (conflicts.length > 0) {
            await connection.rollback();

            return res.status(409).json({
                message: "Il tavolo è già prenotato in questa data e ora.",
            });
        }

        const customerParts = customer.trim().split(/\s+/);
        const firstName = customerParts.shift();
        const lastName = customerParts.join(" ") || null;

        const [existingCustomers] = await connection.query(
            `
        SELECT id
        FROM customers
        WHERE phone = ?
        LIMIT 1
      `,
            [phone.trim()]
        );

        let customerId;

        if (existingCustomers.length > 0) {
            customerId = existingCustomers[0].id;

            await connection.query(
                `
          UPDATE customers
          SET first_name = ?, last_name = ?
          WHERE id = ?
        `,
                [firstName, lastName, customerId]
            );
        } else {
            const [customerResult] = await connection.query(
                `
          INSERT INTO customers
            (first_name, last_name, phone)
          VALUES (?, ?, ?)
        `,
                [firstName, lastName, phone.trim()]
            );

            customerId = customerResult.insertId;
        }

        const [reservationResult] = await connection.query(
            `
        INSERT INTO reservations (
          customer_id,
          reservation_date,
          reservation_time,
          people,
          room,
          table_number,
          notes,
          status
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, 'booked')
      `,
            [
                customerId,
                date,
                time,
                peopleNumber,
                room,
                tableNumber,
                notes.trim(),
            ]
        );

        await connection.commit();

        res.status(201).json({
            id: reservationResult.insertId,
            message: "Prenotazione salvata correttamente.",
        });
    } catch (error) {
        await connection.rollback();
        console.error("Errore salvataggio prenotazione:", error);

        res.status(500).json({
            message: "Impossibile salvare la prenotazione.",
        });
    } finally {
        connection.release();
    }
});

app.listen(PORT, () => {
    console.log(`🚀 Server avviato sulla porta ${PORT}`);
});