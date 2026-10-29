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

