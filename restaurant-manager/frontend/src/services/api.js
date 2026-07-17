import axios from "axios";

const api = axios.create({
    baseURL: "http://localhost:5000",
    headers: {
        "Content-Type": "application/json",
    },
});

export async function getAvailableTables({
    date,
    time,
    room,
    reservationId,
}) {
    const response = await api.get("/available-tables", {
        params: {
            date,
            time,
            room,
            ...(reservationId
                ? { reservationId }
                : {}),
        },
    });

    return response.data;
}

export default api;