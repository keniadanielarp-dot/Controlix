// Obtener el error enviado por php
const param = new URLSearchParams(window.location.search);
const error = param.get("error");

if (error === "credentials") {
    document.getElementById("alert_login").classList.remove("d-none");

} else if (error === "inac_user") {
    document.getElementById("alert_status").classList.remove("d-none");
}
//termina login.js