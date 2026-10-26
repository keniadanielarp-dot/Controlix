/* ------------------------------------------------ OPCION PRINCIPAL DASHBOARD -------------------------------------------------------------- */
//Boton de tres lineas para plegar y desplegar menu
const button_line = document.getElementById("button_line");
button_line.addEventListener("click", function () {

    // Plegar o desplegar
    document.body.classList.toggle("folded_panel");

    // Si está oculto...
    const folded = document.body.classList.contains("folded_panel");

    // Lo actualiza
    button_line.setAttribute("aria-expanded", String(!folded));
    button_line.setAttribute(
        "aria-label",
        folded ? "Mostrar menú" : "Ocultar menú"
    );
});


// Mostrar saludo en la barra superior derecha 
fetch("../php/dashboard_admin.php")
    .then(res => {
        if (!res.ok) {
            throw new Error("No se pudieron obtener los datos");
        }

        return res.json();
    })
    .then(data => {
        // Saludo en barra superior derecha
        document.getElementById("user_welc").textContent = "Hola, " + data.name_user;
        //Rol
        document.getElementById("rol_dash").textContent = data.rol;

        // Nombre del usuario en menu desplegable
        document.getElementById("name_profile").textContent = data.name_user;

    })
    .catch(error => {
        console.error("Error al cargar el perfil:", error);
    });


/* ------------------------------------------------ OPCION USUARIOS -------------------------------------------------------------- */

// Localiza el enlace de usuarios.
const option_users = document.getElementById("option_users");

// Cuando el usuario hace click...
option_users.addEventListener("click", async function (ev) {

    // Evita que el enlace navegue a otra página.
    ev.preventDefault();

    try {

        // Solicita el contenido de users.html.
        const res = await fetch("users.html");

        // Obtiene el contenido HTML.
        const content = await res.text();

        // Busca el contenedor principal del Dashboard.
        const container = document.getElementById("module_content");

        // Muestra el módulo Usuarios.
        container.innerHTML = content;

        // Cargar los registros reales en la tabla después de hacer click en la opcion Usuarios del panel.
        await users_table();

        // Actualiza el nombre del módulo en la ruta de navegación.
        const module_name = document.getElementById("module_name");

        if (module_name) {
            module_name.textContent = "Usuarios";
        }

    } catch (error) {

        // Muestra el error en la consola.
        console.error("Error al cargar Usuarios:", error);

    }

});


// Tabla usuarios 
async function users_table() {

    try {

        // Solicitar los registros al archivo PHP.
        const res = await fetch("/sistema_calidad/php/users.php");

        // Convertir la respuesta JSON en un objeto JavaScript.
        const data = await res.json();

        // Localizar el cuerpo de la tabla.
        const table = document.getElementById("users_table_body");

        // Limpiar los registros anteriores.
        table.innerHTML = "";

        // Recorrer los usuarios obtenidos.
        data.users.forEach(function (u_database, index) {

            // Crear una fila.
            const row = table.insertRow();

            // Crear la casilla de selección.
            const selection = document.createElement("td");
            const ch_box = document.createElement("input");

            ch_box.type = "checkbox";
            ch_box.className = "select_user";
            ch_box.value = u_database.id_user;
            ch_box.setAttribute(
                "aria-label",
                "Seleccionar usuario " + u_database.id_user
            );

            selection.appendChild(ch_box);
            row.appendChild(selection);

            // Columna de los ID's consecutivos para la tabla de Controlix
            const con_index = row.insertCell();
            con_index.textContent = index + 1;

            // Crear las celdas de información.
            const in_user = [
                u_database.name_user,
                u_database.user,
                "********",
                u_database.rol
            ];

            in_user.forEach(function (value) {

                const cell = document.createElement("td");

                cell.textContent = value;

                row.appendChild(cell);

            });

            // Agregar la fila a la tabla.
            table.appendChild(row);

        });

    } catch (error) {

        // Mostrar el error en la consola.
        console.error("Error al cargar usuarios:", error);

    }

}

