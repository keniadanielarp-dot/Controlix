<?php
session_start();

// Conexión a base de datos
require_once 'connection_bdd.php';

// VERIFICAR QUE LA SOLICITUD SEA POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    exit("Metodo no permitido");
}
//Recibir datos del formulario 
$user = trim($_POST["user_login"] ?? "");
$pass = $_POST["pass_login"] ?? "";

//Búsqueda del usuario en la BD 
$sql = "SELECT id_user, passwd_user, name_user, status_user
       FROM myr_users 
       WHERE user = ?";

$query = $connection -> prepare($sql);

//TEMPORAL

// PREPARAR LA CONSULTA SQL
$query = $connection->prepare($query);

// VERIFICAR SI LA CONSULTA SE PREPARO CORRECTAMENTE
if ($query === false) {

    // MOSTRAR EL ERROR REAL DE MARIA DB
    die("Error en la consulta SQL: " . $connection->error);
}

// ASIGNAR EL ID DEL USUARIO
$query->bind_param("i", $id_user);
//TEMPORAL











?> 






