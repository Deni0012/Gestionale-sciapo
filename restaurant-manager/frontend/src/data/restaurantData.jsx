export const rooms = [
    {
        id: 1,
        name: "Sala",
        tables: Array.from({ length: 30 }, (_, i) => ({
            number: i + 1,
            status: "free",
        })),
    },

    {
        id: 2,
        name: "Patio",
        tables: Array.from({ length: 30 }, (_, i) => ({
            number: i + 101,
            status: "free",
        })),
    },

    {
        id: 3,
        name: "Esterno",
        tables: Array.from({ length: 30 }, (_, i) => ({
            number: i + 201,
            status: "free",
        })),
    },
];