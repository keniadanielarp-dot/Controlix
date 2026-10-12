<?php
//Iniciar sesión
//Datos de conexión a mysql
$host = "localhost";
$user = "root"; 
$pass = "";
$db = "myr_quality_adidas";

//conexión
$connection = new mysqli(
    $host,
    $user,
    $pass,
    $db
);

//Verificar conexión
if($connection -> connect_error){
    die("Error de conexión: ".$connection -> connect_error);
}

//Recibir datos del formulario 
$user = $_POST["user_login"] ?? "";
$pass = $_POST["pass_login"] ?? "";

//Búsqueda del usuario en la BD 
$sql = "SELECT name_user, passwd_user, status_user
       FROM myr_users 
       WHERE name_user = ? AND status_user = 1";

$query = $connection -> prepare($sql);
$query -> bind_param("s", $user); 
$query -> execute();
$res = $query -> get_result();

// Comprobación.
if ($res->num_rows === 1) {
    $row = $res->fetch_assoc();

    // Comparación.
    if ($pass === $row["passwd_user"]) {

        // Comparación de status activo
        if ((int)$row["status_user"] === 1) {
            echo "Inicio de sesion exitoso :)";
        // Comparación de status inactivo
        } else if((int)$row["status_user"] === 0) {
            echo "Acceso no autorizado";
        }

    } else {
        // La contraseña es incorrecta.
        header("Location: login.html?error=credentials");
        exit;
    }

} else {
    // El usuario no se encuentra.
        echo "El usuario no se encuentra.";
}
?>
