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
$sql = "SELECT user, passwd_user, status_user
       FROM myr_users 
       WHERE user = ? AND status_user = 1";

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
            header("Location: dashboard_admin.html");

        // Comparación de status inactivo
        } else if((int)$row["status_user"] === 0) { //NO ENTRA AL IF 
            echo "<script>
            alert('Usuario inactivo');
            window.location.href = 'login.html';
            </script>";
        }

    } else {
        // La contraseña es incorrecta.
        header("Location: login.html?error.credentials");
    }

} else {
    // El usuario es incorrecto.
        header("Location: login.html?error.credentials");
}
?>