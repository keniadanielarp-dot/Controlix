




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






// Respuesta json
header("Content-Type: application/json; charset=utf-8");

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





//CONEXION A BDD QUE SI JALA 
<!-- <?php
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
           // $_SESSION["name_user"] = $row["name_user"];
            header("Location: ../html/dashboard_admin.html");
            

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





