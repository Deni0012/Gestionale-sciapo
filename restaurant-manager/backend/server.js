import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import db from "./db.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

const ALLOWED_ROOMS = ["Sala", "Patio", "Esterno"];

const ALLOWED_STATUSES = [
    "booked",
    "confirmed",
    "completed",
    "cancelled",
];

app.use(cors());
app.use(express.json());

function normalizeTables(tables) {
    if (!Array.isArray(tables)) {
        return [];
    }

    return [
        ...new Set(
            tables
                .map(Number)
                .filter((tableNumber) => Number.isInteger(tableNumber))
        ),
    ].sort((first, second) => first - second);
}

function splitCustomerName(customer) {
    const parts = customer.trim().split(/\s+/);
    const firstName = parts.shift();
    const lastName = parts.join(" ") || null;

    return {
        firstName,
        lastName,
    };
}

app.get("/", (req, res) => {
    res.send("API Gestionale Ristorante attiva");
});

app.get("/dashboard", async (req, res) => {
    try {
        const { date } = req.query;

        const selectedDate =
            date || new Date().toISOString().slice(0, 10);

        const [statsRows] = await db.query(
            `
        SELECT
          COUNT(DISTINCT r.id) AS reservations,
          COALESCE(SUM(r.people), 0) AS people,
          COUNT(DISTINCT rt.table_number) AS assigned_tables
        FROM reservations r
        LEFT JOIN reservation_tables rt
          ON rt.reservation_id = r.id
        WHERE r.reservation_date = ?
          AND r.status NOT IN ('cancelled', 'completed')
      `,
            [selectedDate]
        );

        const [arrivalsRows] = await db.query(
            `
        SELECT
          r.id,
          TIME_FORMAT(r.reservation_time, '%H:%i') AS time,
          r.people,
          r.room,
          r.notes,
          r.status,
          c.first_name,
          c.last_name,
          c.phone,
          GROUP_CONCAT(
            DISTINCT rt.table_number
            ORDER BY rt.table_number
            SEPARATOR ','
          ) AS tables
        FROM reservations r
        LEFT JOIN customers c
          ON c.id = r.customer_id
        LEFT JOIN reservation_tables rt
          ON rt.reservation_id = r.id
        WHERE r.reservation_date = ?
          AND r.status NOT IN ('cancelled', 'completed')
        GROUP BY
          r.id,
          r.reservation_time,
          r.people,
          r.room,
          r.notes,
          r.status,
          c.first_name,
          c.last_name,
          c.phone
        ORDER BY r.reservation_time ASC
      `,
            [selectedDate]
        );

        const stats = statsRows[0];

        const assignedTables =
            Number(stats.assigned_tables) || 0;

        const totalTables = 90;

        const arrivals = arrivalsRows.map((arrival) => ({
            ...arrival,
            tables: arrival.tables
                ? arrival.tables.split(",").map(Number)
                : [],
        }));

        res.json({
            date: selectedDate,
            stats: {
                reservations: Number(stats.reservations) || 0,
                people: Number(stats.people) || 0,
                assignedTables,
                freeTables: Math.max(
                    totalTables - assignedTables,
                    0
                ),
                totalTables,
            },
            arrivals,
        });
    } catch (error) {
        console.error("Errore Dashboard:", error);

        res.status(500).json({
            message: "Impossibile caricare la Dashboard.",
        });
    }
});

/* =========================================================
   LETTURA PRENOTAZIONI
========================================================= */

app.get("/reservations", async (req, res) => {
    try {
        const [rows] = await db.query(`
      SELECT
        r.id,
        r.reservation_date AS date,
        TIME_FORMAT(r.reservation_time, '%H:%i') AS time,
        r.people,
        r.room,
        r.notes,
        r.status,
        c.first_name,
        c.last_name,
        c.phone,
        c.email,
        COALESCE(
          GROUP_CONCAT(
            DISTINCT rt.table_number
            ORDER BY rt.table_number
            SEPARATOR ','
          ),
          CAST(r.table_number AS CHAR)
        ) AS tables
      FROM reservations r
      LEFT JOIN customers c
        ON c.id = r.customer_id
      LEFT JOIN reservation_tables rt
        ON rt.reservation_id = r.id
      GROUP BY
        r.id,
        r.reservation_date,
        r.reservation_time,
        r.people,
        r.room,
        r.table_number,
        r.notes,
        r.status,
        c.first_name,
        c.last_name,
        c.phone,
        c.email
      ORDER BY
        r.reservation_date ASC,
        r.reservation_time ASC
    `);

        const reservations = rows.map((reservation) => ({
            ...reservation,
            tables: reservation.tables
                ? reservation.tables
                    .split(",")
                    .map(Number)
                    .filter(Number.isInteger)
                : [],
        }));

        res.json(reservations);
    } catch (error) {
        console.error("Errore lettura prenotazioni:", error);

        res.status(500).json({
            message: "Impossibile leggere le prenotazioni.",
        });
    }
});

/* =========================================================
   TAVOLI DISPONIBILI
========================================================= */

app.get("/available-tables", async (req, res) => {
    try {
        const { date, time, room, reservationId } = req.query;

        if (!date || !time || !room) {
            return res.status(400).json({
                message: "Data, orario e zona sono obbligatori.",
            });
        }

        if (!ALLOWED_ROOMS.includes(room)) {
            return res.status(400).json({
                message: "Zona non valida.",
            });
        }

        const values = [room, date, time];
        let currentReservationCondition = "";

        if (reservationId) {
            currentReservationCondition = "AND r.id <> ?";
            values.push(Number(reservationId));
        }

        const [tables] = await db.query(
            `
        SELECT
          t.id,
          t.room,
          t.table_number,
          t.status
        FROM tables t
        WHERE t.room = ?
          AND t.status <> 'out'
          AND t.table_number NOT IN (
            SELECT rt.table_number
            FROM reservation_tables rt
            INNER JOIN reservations r
              ON r.id = rt.reservation_id
            WHERE r.reservation_date = ?
              AND r.reservation_time = ?
              AND r.status NOT IN ('cancelled', 'completed')
              ${currentReservationCondition}
          )
        ORDER BY t.table_number ASC
      `,
            values
        );

        res.json(tables);
    } catch (error) {
        console.error("Errore tavoli disponibili:", error);

        res.status(500).json({
            message: "Impossibile caricare i tavoli disponibili.",
        });
    }
});

/* =========================================================
   CREAZIONE PRENOTAZIONE
========================================================= */

app.post("/reservations", async (req, res) => {
    const {
        date,
        time,
        customer,
        phone,
        people,
        room,
        tables,
        notes = "",
        status = "booked",
    } = req.body;

    const tableNumbers = normalizeTables(tables);
    const peopleNumber = Number(people);

    if (
        !date ||
        !time ||
        !customer?.trim() ||
        !phone?.trim() ||
        !people ||
        !room ||
        tableNumbers.length === 0
    ) {
        return res.status(400).json({
            message:
                "Compila tutti i campi obbligatori e seleziona almeno un tavolo.",
        });
    }

    if (
        !Number.isInteger(peopleNumber) ||
        peopleNumber < 1
    ) {
        return res.status(400).json({
            message: "Il numero di persone non è valido.",
        });
    }

    if (!ALLOWED_ROOMS.includes(room)) {
        return res.status(400).json({
            message: "Zona non valida.",
        });
    }

    if (!ALLOWED_STATUSES.includes(status)) {
        return res.status(400).json({
            message: "Stato non valido.",
        });
    }

    const connection = await db.getConnection();

    try {
        await connection.beginTransaction();

        /*
         * Verifica che tutti i tavoli selezionati esistano
         * nella zona indicata. Non viene controllata la capienza.
         */
        const [existingTables] = await connection.query(
            `
        SELECT table_number
        FROM tables
        WHERE room = ?
          AND status <> 'out'
          AND table_number IN (?)
      `,
            [room, tableNumbers]
        );

        if (existingTables.length !== tableNumbers.length) {
            await connection.rollback();

            return res.status(400).json({
                message:
                    "Uno o più tavoli selezionati non appartengono alla zona scelta.",
            });
        }

        /*
         * Controllo conflitti.
         */
        const [conflicts] = await connection.query(
            `
        SELECT DISTINCT
          rt.table_number
        FROM reservation_tables rt
        INNER JOIN reservations r
          ON r.id = rt.reservation_id
        WHERE r.reservation_date = ?
          AND r.reservation_time = ?
          AND r.status NOT IN ('cancelled', 'completed')
          AND rt.table_number IN (?)
      `,
            [date, time, tableNumbers]
        );

        if (conflicts.length > 0) {
            await connection.rollback();

            const occupiedTables = conflicts
                .map((conflict) => conflict.table_number)
                .join(", ");

            return res.status(409).json({
                message: `I tavoli ${occupiedTables} sono già prenotati in questa data e ora.`,
            });
        }

        /*
         * Ricerca o creazione cliente.
         */
        const { firstName, lastName } =
            splitCustomerName(customer);

        const normalizedPhone = phone.trim();

        const [existingCustomers] = await connection.query(
            `
        SELECT id
        FROM customers
        WHERE phone = ?
        LIMIT 1
      `,
            [normalizedPhone]
        );

        let customerId;

        if (existingCustomers.length > 0) {
            customerId = existingCustomers[0].id;

            await connection.query(
                `
          UPDATE customers
          SET
            first_name = ?,
            last_name = ?
          WHERE id = ?
        `,
                [firstName, lastName, customerId]
            );
        } else {
            const [customerResult] = await connection.query(
                `
          INSERT INTO customers (
            first_name,
            last_name,
            phone
          )
          VALUES (?, ?, ?)
        `,
                [firstName, lastName, normalizedPhone]
            );

            customerId = customerResult.insertId;
        }

        /*
         * Manteniamo il primo tavolo anche nella vecchia colonna
         * reservations.table_number per compatibilità.
         */
        const primaryTableNumber = tableNumbers[0];

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
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `,
            [
                customerId,
                date,
                time,
                peopleNumber,
                room,
                primaryTableNumber,
                notes.trim(),
                status,
            ]
        );

        const reservationId = reservationResult.insertId;

        const reservationTableValues = tableNumbers.map(
            (tableNumber) => [
                reservationId,
                tableNumber,
            ]
        );

        await connection.query(
            `
        INSERT INTO reservation_tables (
          reservation_id,
          table_number
        )
        VALUES ?
      `,
            [reservationTableValues]
        );

        await connection.commit();

        res.status(201).json({
            id: reservationId,
            message: "Prenotazione salvata correttamente.",
        });
    } catch (error) {
        await connection.rollback();

        console.error(
            "Errore salvataggio prenotazione:",
            error
        );

        res.status(500).json({
            message: "Impossibile salvare la prenotazione.",
        });
    } finally {
        connection.release();
    }
});

/* =========================================================
   MODIFICA PRENOTAZIONE
========================================================= */

app.put("/reservations/:id", async (req, res) => {
    const reservationId = Number(req.params.id);

    const {
        date,
        time,
        customer,
        phone,
        people,
        room,
        tables,
        notes = "",
        status = "booked",
    } = req.body;

    const tableNumbers = normalizeTables(tables);
    const peopleNumber = Number(people);

    if (!Number.isInteger(reservationId)) {
        return res.status(400).json({
            message: "ID prenotazione non valido.",
        });
    }

    if (
        !date ||
        !time ||
        !customer?.trim() ||
        !phone?.trim() ||
        !people ||
        !room ||
        tableNumbers.length === 0
    ) {
        return res.status(400).json({
            message:
                "Compila tutti i campi obbligatori e seleziona almeno un tavolo.",
        });
    }

    if (
        !Number.isInteger(peopleNumber) ||
        peopleNumber < 1
    ) {
        return res.status(400).json({
            message: "Il numero di persone non è valido.",
        });
    }

    if (!ALLOWED_ROOMS.includes(room)) {
        return res.status(400).json({
            message: "Zona non valida.",
        });
    }

    if (!ALLOWED_STATUSES.includes(status)) {
        return res.status(400).json({
            message: "Stato non valido.",
        });
    }

    const connection = await db.getConnection();

    try {
        await connection.beginTransaction();

        const [existingReservations] =
            await connection.query(
                `
          SELECT customer_id
          FROM reservations
          WHERE id = ?
          LIMIT 1
        `,
                [reservationId]
            );

        if (existingReservations.length === 0) {
            await connection.rollback();

            return res.status(404).json({
                message: "Prenotazione non trovata.",
            });
        }

        const [existingTables] = await connection.query(
            `
        SELECT table_number
        FROM tables
        WHERE room = ?
          AND status <> 'out'
          AND table_number IN (?)
      `,
            [room, tableNumbers]
        );

        if (existingTables.length !== tableNumbers.length) {
            await connection.rollback();

            return res.status(400).json({
                message:
                    "Uno o più tavoli selezionati non appartengono alla zona scelta.",
            });
        }

        const [conflicts] = await connection.query(
            `
        SELECT DISTINCT
          rt.table_number
        FROM reservation_tables rt
        INNER JOIN reservations r
          ON r.id = rt.reservation_id
        WHERE r.reservation_date = ?
          AND r.reservation_time = ?
          AND r.id <> ?
          AND r.status NOT IN ('cancelled', 'completed')
          AND rt.table_number IN (?)
      `,
            [
                date,
                time,
                reservationId,
                tableNumbers,
            ]
        );

        if (conflicts.length > 0) {
            await connection.rollback();

            const occupiedTables = conflicts
                .map((conflict) => conflict.table_number)
                .join(", ");

            return res.status(409).json({
                message: `I tavoli ${occupiedTables} sono già prenotati in questa data e ora.`,
            });
        }

        const customerId =
            existingReservations[0].customer_id;

        const { firstName, lastName } =
            splitCustomerName(customer);

        if (customerId) {
            await connection.query(
                `
          UPDATE customers
          SET
            first_name = ?,
            last_name = ?,
            phone = ?
          WHERE id = ?
        `,
                [
                    firstName,
                    lastName,
                    phone.trim(),
                    customerId,
                ]
            );
        }

        const primaryTableNumber = tableNumbers[0];

        await connection.query(
            `
        UPDATE reservations
        SET
          reservation_date = ?,
          reservation_time = ?,
          people = ?,
          room = ?,
          table_number = ?,
          notes = ?,
          status = ?
        WHERE id = ?
      `,
            [
                date,
                time,
                peopleNumber,
                room,
                primaryTableNumber,
                notes.trim(),
                status,
                reservationId,
            ]
        );

        /*
         * Sostituiamo l’elenco dei tavoli assegnati.
         */
        await connection.query(
            `
        DELETE FROM reservation_tables
        WHERE reservation_id = ?
      `,
            [reservationId]
        );

        const reservationTableValues = tableNumbers.map(
            (tableNumber) => [
                reservationId,
                tableNumber,
            ]
        );

        await connection.query(
            `
        INSERT INTO reservation_tables (
          reservation_id,
          table_number
        )
        VALUES ?
      `,
            [reservationTableValues]
        );

        await connection.commit();

        res.json({
            message: "Prenotazione aggiornata correttamente.",
        });
    } catch (error) {
        await connection.rollback();

        console.error(
            "Errore modifica prenotazione:",
            error
        );

        res.status(500).json({
            message: "Impossibile modificare la prenotazione.",
        });
    } finally {
        connection.release();
    }
});

/* =========================================================
   MODIFICA DEL SOLO STATO
========================================================= */

app.patch(
    "/reservations/:id/status",
    async (req, res) => {
        try {
            const reservationId = Number(req.params.id);
            const { status } = req.body;

            if (!Number.isInteger(reservationId)) {
                return res.status(400).json({
                    message: "ID prenotazione non valido.",
                });
            }

            if (!ALLOWED_STATUSES.includes(status)) {
                return res.status(400).json({
                    message: "Stato non valido.",
                });
            }

            const [result] = await db.query(
                `
          UPDATE reservations
          SET status = ?
          WHERE id = ?
        `,
                [status, reservationId]
            );

            if (result.affectedRows === 0) {
                return res.status(404).json({
                    message: "Prenotazione non trovata.",
                });
            }

            res.json({
                message: "Stato aggiornato correttamente.",
            });
        } catch (error) {
            console.error(
                "Errore aggiornamento stato:",
                error
            );

            res.status(500).json({
                message:
                    "Impossibile aggiornare lo stato della prenotazione.",
            });
        }
    }
);

/* =========================================================
   ELIMINAZIONE PRENOTAZIONE
========================================================= */

app.delete("/reservations/:id", async (req, res) => {
    const reservationId = Number(req.params.id);
    const connection = await db.getConnection();

    if (!Number.isInteger(reservationId)) {
        connection.release();

        return res.status(400).json({
            message: "ID prenotazione non valido.",
        });
    }

    try {
        await connection.beginTransaction();

        /*
         * La cancellazione dalla tabella di collegamento sarebbe
         * automatica con ON DELETE CASCADE, ma la eseguiamo anche
         * esplicitamente per sicurezza.
         */
        await connection.query(
            `
        DELETE FROM reservation_tables
        WHERE reservation_id = ?
      `,
            [reservationId]
        );

        const [result] = await connection.query(
            `
        DELETE FROM reservations
        WHERE id = ?
      `,
            [reservationId]
        );

        if (result.affectedRows === 0) {
            await connection.rollback();

            return res.status(404).json({
                message: "Prenotazione non trovata.",
            });
        }

        await connection.commit();

        res.json({
            message: "Prenotazione eliminata correttamente.",
        });
    } catch (error) {
        await connection.rollback();

        console.error(
            "Errore eliminazione prenotazione:",
            error
        );

        res.status(500).json({
            message: "Impossibile eliminare la prenotazione.",
        });
    } finally {
        connection.release();
    }
});

app.get("/tables-map", async (req, res) => {
    try {
        const { date } = req.query;

        const selectedDate =
            date || new Date().toISOString().slice(0, 10);

        const [tables] = await db.query(
            `
        SELECT
          t.id,
          t.room,
          t.table_number,
          t.status AS table_status,

          r.id AS reservation_id,
          r.people,
          r.notes,
          r.status AS reservation_status,
          TIME_FORMAT(r.reservation_time, '%H:%i') AS time,

          c.first_name,
          c.last_name,
          c.phone

        FROM tables t

        LEFT JOIN reservation_tables rt
          ON rt.table_number = t.table_number

        LEFT JOIN reservations r
          ON r.id = rt.reservation_id
          AND r.reservation_date = ?
          AND r.status NOT IN ('cancelled', 'completed')

        LEFT JOIN customers c
          ON c.id = r.customer_id

        ORDER BY
          FIELD(t.room, 'Sala', 'Patio', 'Esterno'),
          t.table_number
      `,
            [selectedDate]
        );

        const groupedTables = tables.reduce((result, table) => {
            const room = table.room;

            if (!result[room]) {
                result[room] = [];
            }

            let status = "free";

            if (table.table_status === "out") {
                status = "out";
            } else if (table.reservation_status === "confirmed") {
                status = "busy";
            } else if (table.reservation_id) {
                status = "booked";
            }

            result[room].push({
                id: table.id,
                number: table.table_number,
                status,
                reservation: table.reservation_id
                    ? {
                        id: table.reservation_id,
                        time: table.time,
                        people: table.people,
                        notes: table.notes,
                        status: table.reservation_status,
                        customer: [
                            table.first_name,
                            table.last_name,
                        ]
                            .filter(Boolean)
                            .join(" "),
                        phone: table.phone,
                    }
                    : null,
            });

            return result;
        }, {});

        res.json({
            date: selectedDate,
            rooms: [
                {
                    id: 1,
                    name: "Sala",
                    tables: groupedTables.Sala || [],
                },
                {
                    id: 2,
                    name: "Patio",
                    tables: groupedTables.Patio || [],
                },
                {
                    id: 3,
                    name: "Esterno",
                    tables: groupedTables.Esterno || [],
                },
            ],
        });
    } catch (error) {
        console.error("Errore piantina tavoli:", error);

        res.status(500).json({
            message: "Impossibile caricare la piantina dei tavoli.",
        });
    }
});

app.listen(PORT, () => {
    console.log(
        `🚀 Server avviato sulla porta ${PORT}`
    );
});