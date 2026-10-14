




<?php
session_start();

// Comprobar que el usuario este autenticado 
if (!isset($_SESSION["auth"]) || $_SESSION["auth"] !== true || !isset($_SESSION["id_user"])) {
    http_response_code(401);
    echo json_encode(["error" =< "Usuario no autenticado"]);
    header("Location: ../html/login.html");
    exit;
}

// Recuperar datos del usuario
$id_user = (int) $_SESSION["id_user"];
$name_user = $_SESSION["name_user"] ?? "";
$rol = $_SESSION["rol"] ?? "";

// Devolver los datos en formato json 
header("Content-Type: application/json; charset=utf-8");

// Devolver los datos en formato JSON
echo json_encode([
    "name" => $name_user,
    "rol" => $rol
]);

exit;
?>