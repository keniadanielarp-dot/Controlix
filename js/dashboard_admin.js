  const button_line = document.getElementById("button_line");
        button_line.addEventListener("click", function () {

            // Plegar o desplegar
            document.body.classList.toggle("folded_panel");

            // Si está oculto...
            const folded = document.body.classList.contains("folded_panel");

            // Lo actualiza
            button_line.setAttribute("aria-expanded", String(!folded));
            button_line.setAttribute(
                "aria-label",
                folded ? "Mostrar menú" : "Ocultar menú"
            );
        });