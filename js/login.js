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


//Mensaje de alerta para usuario o contraseña incorrectos

// Obtener el error enviado por php
const param = new URLSearchParams(window.location.search);
const error = param.get("error");

// MOSTRAR SOLO LA ALERTA CORRESPONDIENTE
if (error === "credentials") {
    document.getElementById("alert_login").classList.remove("d-none");

} else if (error === "inac_user") {
    document.getElementById("alert_status").classList.remove("d-none");
}
