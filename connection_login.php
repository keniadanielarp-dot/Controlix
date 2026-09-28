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
$sql = "SELECT id_user, name_user, passwd_user, rol_user,
        status_user, created_by, created_at, updated_by, updated_at
       FROM myr_users 
       WHERE name_user = ?";

$query = $connection -> prepare($sql);
$query -> bind_param("s", $user);
$query -> execute();
$res = $query -> get_result();

//Comprobación
if($res -> num_rows === 1){
    $row = $res -> fetch_assoc();

    //Comparar contraseña
    if($pass === $row["passwd_user"]) {
        echo "Inicio de sesión exitoso :)";
    } else{
        "Usuario o contraseña incorrectos";
    }
} else{
    echo "Usuario o contraseña incorrectos";
}
?>

