-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Servidor: 127.0.0.1
-- Tiempo de generación: 15-09-2026 a las 16:35:42
-- Versión del servidor: 10.4.32-MariaDB
-- Versión de PHP: 8.0.30

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Base de datos: `myr_quality_adidas`
--

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `myr_users`
--

CREATE TABLE `myr_users` (
  `id_user` int(11) NOT NULL,
  `name_user` varchar(50) NOT NULL,
  `passwd_user` varchar(60) NOT NULL,
  `rol_user` int(11) NOT NULL,
  `status` int(11) NOT NULL,
  `created_by` int(11) NOT NULL,
  `created_at` datetime NOT NULL,
  `updated_by` int(11) NOT NULL,
  `updated_at` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `myr_users`
--

INSERT INTO `myr_users` (`id_user`, `name_user`, `passwd_user`, `rol_user`, `status`, `created_by`, `created_at`, `updated_by`, `updated_at`) VALUES
(1, 'admin', '1234', 1, 1, 1, '2026-09-15 16:01:38', 1, '2026-09-15 16:01:38');

--
-- Índices para tablas volcadas
--

--
-- Indices de la tabla `myr_users`
--
ALTER TABLE `myr_users`
  ADD PRIMARY KEY (`id_user`);

--
-- AUTO_INCREMENT de las tablas volcadas
--

--
-- AUTO_INCREMENT de la tabla `myr_users`
--
ALTER TABLE `myr_users`
  MODIFY `id_user` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
