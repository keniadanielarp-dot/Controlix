<?php
//Iniciar sesión
session_start();

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
$user = trim($_POST["user_login"] ?? "");
$pass = $_POST["pass_login"] ?? "";

//Búsqueda del usuario en la BD 
$sql = "SELECT user, passwd_user, name_user, status_user
       FROM myr_users 
       WHERE user = ?";

$query = $connection -> prepare($sql);
$query -> bind_param("s", $user); 
$query -> execute();
$res = $query -> get_result();


// Comprueba que se encontro exactamente un usuario.
if ($res->num_rows === 1) {
    //Si lo encontró...

    // Recupera los datos del usuario.
    $row = $res->fetch_assoc();

   //Comparación de contraseña.
   if ($pass === $row["passwd_user"]) {
    //Si es correcta...

        // Comparación de status activo
        if ((int)$row["status_user"] === 1) {
            header("Location: ../html/dashboard_admin.html");
            $_SESSION["name_user"] = $row["name_user"];

        // Comparación de status inactivo
        } else{  
            header("Location: ../html/login.html?error=inac_user");
            exit;
        }

    } else {
        // La contraseña es incorrecta.
        header("Location: ../html/login.html?error=credentials");
        exit;
    }

} else {
    // El usuario es incorrecto.
    header("Location: ../html/login.html?error=credentials");
    exit;
}
?>