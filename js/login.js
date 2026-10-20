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



// BLOQUE: Mostrar mensaje de error 

// Cuando se ingresa mal el usuario y la contraseña, los input se vacían.
// Cuando se ingresa mal el usuario y la contraseña bien, solo se elimina el input de la contraseña. 

// Obtener los datos del formulario de login.html
const form = document.getElementById("form_alert");
const txt_usu = document.getElementById("user");
const txt_pass = document.getElementById("pass");

//Obtener los mensajes desde HTML
const login_error = document.getElementById("alert_login");
const login_error2 = document.getElementById("alert_login2");
const status_error = document.getElementById("alert_status");

// Guardar temporalmente el usuario al enviar el formulario
if (form && txt_usu) {

    form.addEventListener("submit", function () {
        sessionStorage.setItem("usu_temp", txt_usu.value);
    });

}

// Identificar el error enviado por php
const param = new URLSearchParams(window.location.search);
const url_error = param.get("error");

// Mostrar el error y recuperar el usuario
if (url_error !== null) {

    // Mostrar el mensaje correspondiente
    if (url_error === "credentials") {
        login_error.classList.remove("d-none");
    }
    if (url_error === "credentials2") {
        login_error2.classList.remove("d-none");
        if (txt_usu) {
            txt_usu.value =
                sessionStorage.getItem("usu_temp") || "";
        }

        if (txt_pass) {
            txt_pass.value = "";
        }

    }

    if (url_error === "inac_user") {
        status_error.classList.remove("d-none");
    }

    // Eliminar el parametro error sin recargar la pagina
    const url_clean = window.location.pathname + window.location.hash;
    window.history.replaceState(null, "", url_clean);
}

// Limpiar el login al regresar desde el dashboard 
window.addEventListener("pageshow", function (ev) {

    if (ev.persisted) {

        if (txt_usu) {
            txt_usu.value = "";
        }

        if (txt_pass) {
            txt_pass.value = "";
        }

        login_error.classList.add("d-none");
        status_error.classList.add("d-none");

        sessionStorage.removeItem("usu_temp");
    }

});














