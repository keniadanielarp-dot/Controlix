
<?php
// INICIAR SESION
session_start();



// VERIFICAR EL ESTADO DE LA SESION

echo "Autenticado: ";
echo isset($_SESSION["auth"])
    ? ($_SESSION["auth"] === true ? "SI" : "NO")
    : "NO EXISTE";

echo "<p>ID del usuario: ";
echo isset($_SESSION["id_user"])
    ? "EXISTE"
    : "NO EXISTE";
echo "</p>";

exit;
?>





// INDICAR QUE DEVOLVEREMOS JSON
header("Content-Type: application/json; charset=utf-8");

// COMPROBAR QUE EL USUARIO ESTE AUTENTICADO
if (
    !isset($_SESSION["auth"]) ||
    $_SESSION["auth"] !== true ||
    !isset($_SESSION["id_user"])
) {
    http_response_code(401);

    echo json_encode([
        "error" => "Usuario no autenticado"
    ]);

    exit;
}

// RECUPERAR DATOS DE LA SESION
$id_user = (int) $_SESSION["id_user"];
$name = $_SESSION["name_user"] ?? "";

// CONECTAR CON MARIA DB
$connection = new mysqli(
    "localhost",
    "root",
    "",
    "myr_quality_adidas"
);

if ($connection->connect_error) {
    http_response_code(500);
    echo json_encode(["error" => "Error de conexion"]);
    exit;
}

$connection->set_charset("utf8mb4");

// CONSULTAR EL ROL DEL USUARIO
$sql = "SELECT r.rol
        FROM myr_users AS u
        INNER JOIN rol_users AS r
            ON u.id_rol = r.id_rol
        WHERE u.id_user = ?";

$query = $connection->prepare($sql);

if (!$query) {
    http_response_code(500);
    echo json_encode(["error" => "Error en la consulta"]);
    exit;
}

// ASOCIAR EL ID DEL USUARIO
$query->bind_param("i", $id_user);

// EJECUTAR LA CONSULTA
$query->execute();
$res = $query->get_result();

// RECUPERAR EL ROL
$row = $res->fetch_assoc();

if (!$row) {
    http_response_code(404);
    echo json_encode(["error" => "Rol no encontrado"]);
    exit;
}

// DEVOLVER NOMBRE Y ROL EN JSON
echo json_encode([
    "name" => $name,
    "rol" => $row["nombre_rol"]
]);

// CERRAR RECURSOS
$query->close();
$connection->close();

exit;
?>



