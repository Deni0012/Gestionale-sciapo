import "./TableMaps.css";
import { rooms } from "../data/restaurantData";

function TablesMap() {
    return (
        <div className="tables-map">

            <h2>Piantina Tavoli</h2>

            {rooms.map((room) => (
                <div key={room.id} className="room">

                    <h3>{room.name}</h3>

                    <div className="tables-grid">

                        {room.tables.map((table) => (
                            <button
                                key={table.number}
                                className={`table ${table.status}`}
                            >
                                {table.number}
                            </button>
                        ))}

                    </div>

                </div>
            ))
            }

        </div >
    );
}

export default TablesMap;