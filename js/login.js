//Ícono del ojo (se utiliza la consola)

// Buscamos el input de contraseña por su ID 
const pass_js = document.getElementById("pass");

//Buscamos nuestro ícono del ojo por su clase
const eye = document.querySelector(".eye_pass");

// Cada vez que se haga click en el ojo 
eye.addEventListener("click", function () {

    //Mostramos en la consola el tipo actual del input 
    console.log("Antes del cambio:", pass_js.type);

    // Si está oculta...
    if (pass_js.type === "password") {

        // La mostramos 
        pass_js.type = "text";
        console.log("Ahora se muestra");

        //Cambiar a ojo abierto
        eye.classList.remove("bi-eye-slash");
        eye.classList.add("bi-eye");

    } else {  //Si no...

        // Se vuelve a ocultar 
        pass_js.type = "password";
        console.log("Ahora se oculta");

        //Se oculta nuevamente el ojo 
        eye.classList.remove("bi-eye");
        eye.classList.add("bi-eye-slash");
    }

    // Mostramos qué quedó después del cambio
    console.log("Después del cambio:", pass_js.type);
});


// Borrar datos de los inputs en el login al presionar atrás 

//Detectar cuando se muestra la pagina 
window.addEventListener("pageshow", function () {

    // Campos del login
    const usu = document.getElementById("user");
    const pass = document.getElementById("pass");

    //Limpiar campos 
    if (usu) {
        usu.value = "";
    }
    if (pass) {
        pass.value = "";
    }
});

//Mensaje de error 

//Obtener los mensajes desde HTML
const login_error = document.getElementById("alert_login");
const status_error = document.getElementById("alert_status");

// Obtener el error de php por medio de la URL
const param = new URLSearchParams(window.location.search);
const url_error = param.get("error");

// Mostrar el mensaje correspondiente
if (url_error === "credentials") {
    login_error.classList.remove("d-none");

} else if (url_error === "inac_user") {
    status_error.classList.remove("d-none");
}

// Limpiar el mensaje cuando se regresa desde el Dashboard
window.addEventListener("pageshow", function (ev) {

    // Solo cuando el navegador restaura la pagina
    if (ev.persisted) {
        login_error.classList.add("d-none");
        status_error.classList.add("d-none");

    }

});

// Eliminar el parametro de error del historial
if (url_error !== null) {
    const url_clean = window.location.pathname + window.location.hash;

    window.history.replaceState(null, "", url_clean);

}

