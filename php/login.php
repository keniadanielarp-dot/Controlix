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
//Recibir datos del formulario 
$user = trim($_POST["user_login"] ?? "");
$pass = $_POST["pass_login"] ?? "";

//Búsqueda del usuario en la BD 
$sql = "SELECT id_user, user, passwd_user, name_user, status_user
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
            $_SESSION["auth"] = true;
            $_SESSION["id_user"] = (int)$row["id_user"];
            header("Location: ../html/dashboard_admin.html");
            
        // Comparación de status inactivo
        } else{  
            header("Location: ../html/login.html?error=inac_user");
            exit;
        }

    } else {
        
        // El usuario es incorrecto. 
        header("Location: ../html/login.html?error=credentials2");
        exit;
    }

} else {
    // La contraseña es incorrecta
    header("Location: ../html/login.html?error=credentials");
    exit;
}
?> 




