
<?php

// Conexión a la base de datos 
$host = "localhost";
$user = "root";
$pass = "";
$db = "myr_quality_adidas"; // CAMBIAR POR EL NOMBRE REAL DE TU BDD

// Establecer conexión
$connection = new mysqli(
    $host,
    $user,
    $pass,
    $db
);

// Verificación
if ($connection->connect_error) {
    error_log("Error de conexion: " . $connection->connect_error);
    http_response_code(500);
    exit("Error de conexion a la base de datos");
}

// Configurar caracteres 
$connection->set_charset("utf8mb4");
?>
