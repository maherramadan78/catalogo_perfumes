(() => {
    'use strict';

    const config = window.CATALOGO_CONFIG || {};
    const tipoPedido = config.tipoPedido || 'menudeo';
    const tituloPedido = config.tituloPedido || 'Pedido';
    const CLAVE = `carrito_perfumes_${tipoPedido}_v1`;

    let carrito = cargarCarrito();

    const contador = document.getElementById('contadorCarrito');
    const itemsContenedor = document.getElementById('itemsCarrito');
    const carritoVacio = document.getElementById('carritoVacio');
    const totalElemento = document.getElementById('totalCarrito');
    const btnWhatsApp = document.getElementById('btnWhatsApp');
    const btnVaciar = document.getElementById('btnVaciar');
    const buscador = document.getElementById('buscador');

    function cargarCarrito() {
        try {
            const datos = JSON.parse(localStorage.getItem(CLAVE));
            return Array.isArray(datos) ? datos.map(normalizarItem) : [];
        } catch {
            return [];
        }
    }

    function normalizarItem(item) {
        const minimo = Math.max(1, Number(item.minimo) || 1);

        return {
            id: Number(item.id),
            nombre: item.nombre || '',
            marca: item.marca || '',
            precio: Number(item.precio) || 0,
            foto: item.foto || 'assets/sin-foto.svg',
            stock: Number(item.stock) || 0,
            minimo,
            cantidad: Math.max(minimo, Number(item.cantidad) || minimo)
        };
    }

    function guardarCarrito() {
        localStorage.setItem(CLAVE, JSON.stringify(carrito));
    }

    function dinero(valor) {
        return new Intl.NumberFormat('es-MX', {
            style: 'currency',
            currency: 'MXN'
        }).format(valor);
    }

    function agregarProducto(producto, cantidad) {
        const minimo = Math.max(1, producto.minimo || 1);
        const cantidadFinal = Math.max(minimo, cantidad);
        const existente = carrito.find(item => item.id === producto.id);
        const nuevaCantidad = (existente ? existente.cantidad : 0) + cantidadFinal;

        if (cantidadFinal < minimo) {
            alert(`El minimo para este producto es ${minimo} pieza(s).`);
            return;
        }

        if (nuevaCantidad > producto.stock) {
            alert(`Solo hay ${producto.stock} unidad(es) disponibles.`);
            return;
        }

        if (existente) {
            existente.cantidad = nuevaCantidad;
            existente.stock = producto.stock;
            existente.minimo = minimo;
        } else {
            carrito.push({ ...producto, minimo, cantidad: cantidadFinal });
        }

        guardarCarrito();
        renderizarCarrito();
    }

    function cambiarCantidad(id, cambio) {
        const item = carrito.find(p => p.id === id);
        if (!item) return;

        const minimo = Math.max(1, item.minimo || 1);
        const nuevaCantidad = item.cantidad + cambio;

        if (nuevaCantidad < minimo) {
            eliminarProducto(id);
            return;
        }

        if (nuevaCantidad > item.stock) {
            alert(`Solo hay ${item.stock} unidad(es) disponibles.`);
            return;
        }

        item.cantidad = nuevaCantidad;
        guardarCarrito();
        renderizarCarrito();
    }

    function eliminarProducto(id) {
        carrito = carrito.filter(item => item.id !== id);
        guardarCarrito();
        renderizarCarrito();
    }

    function renderizarCarrito() {
        if (!itemsContenedor || !contador || !totalElemento || !carritoVacio || !btnWhatsApp || !btnVaciar) {
            return;
        }

        itemsContenedor.innerHTML = '';

        const cantidadTotal = carrito.reduce((suma, item) => suma + item.cantidad, 0);
        const total = carrito.reduce((suma, item) => suma + (item.precio * item.cantidad), 0);

        contador.textContent = cantidadTotal;
        totalElemento.textContent = dinero(total);
        carritoVacio.classList.toggle('d-none', carrito.length > 0);
        btnWhatsApp.disabled = carrito.length === 0;
        btnVaciar.disabled = carrito.length === 0;

        carrito.forEach(item => {
            const minimo = Math.max(1, item.minimo || 1);
            const bloque = document.createElement('div');
            bloque.className = 'item-carrito border-bottom pb-3';
            bloque.innerHTML = `
                <img src="${escapeHtml(item.foto)}" alt="">
                <div>
                    <div class="fw-semibold">${escapeHtml(item.nombre)}</div>
                    <div class="small text-secondary">${escapeHtml(item.marca)}</div>
                    <div class="small">${dinero(item.precio)} c/u</div>
                    ${minimo > 1 ? `<div class="small text-success">Minimo: ${minimo} pzas</div>` : ''}
                    <div class="item-controles mt-2">
                        <button class="btn btn-outline-secondary btn-sm" data-accion="restar" data-id="${item.id}">-</button>
                        <span class="fw-semibold">${item.cantidad}</span>
                        <button class="btn btn-outline-secondary btn-sm" data-accion="sumar" data-id="${item.id}">+</button>
                    </div>
                </div>
                <div class="text-end">
                    <div class="fw-bold">${dinero(item.precio * item.cantidad)}</div>
                    <button class="btn btn-link btn-sm text-danger p-0 mt-2" data-accion="eliminar" data-id="${item.id}">
                        Quitar
                    </button>
                </div>
            `;
            itemsContenedor.appendChild(bloque);
        });
    }

    function escapeHtml(valor) {
        return String(valor)
            .replaceAll('&', '&amp;')
            .replaceAll('<', '&lt;')
            .replaceAll('>', '&gt;')
            .replaceAll('"', '&quot;')
            .replaceAll("'", '&#039;');
    }

    document.querySelectorAll('.btn-agregar').forEach(boton => {
        boton.addEventListener('click', () => {
            const tarjeta = boton.closest('.card');
            const input = tarjeta.querySelector('.cantidad');
            const minimo = Number(input.min || boton.dataset.minimo || 1);
            const cantidad = Math.max(minimo, Number.parseInt(input.value, 10) || minimo);

            const producto = {
                id: Number(boton.dataset.id),
                nombre: boton.dataset.nombre,
                marca: boton.dataset.marca,
                precio: Number(boton.dataset.precio),
                foto: boton.dataset.foto,
                stock: Number(boton.dataset.stock),
                minimo: Number(boton.dataset.minimo || 1)
            };

            agregarProducto(producto, cantidad);
            const textoOriginal = boton.textContent;
            boton.textContent = 'Agregado';
            setTimeout(() => {
                boton.textContent = textoOriginal;
            }, 900);
        });
    });

    document.querySelectorAll('.btn-sumar, .btn-restar').forEach(boton => {
        boton.addEventListener('click', () => {
            const grupo = boton.closest('.input-group');
            const input = grupo.querySelector('.cantidad');
            if (input.disabled) return;

            const minimo = Number(input.min || 1);
            const maximo = Number(input.max || 999);
            const actual = Number.parseInt(input.value, 10) || minimo;
            const nuevo = boton.classList.contains('btn-sumar') ? actual + 1 : actual - 1;
            input.value = Math.min(maximo, Math.max(minimo, nuevo));
        });
    });

    itemsContenedor?.addEventListener('click', evento => {
        const boton = evento.target.closest('button[data-accion]');
        if (!boton) return;

        const id = Number(boton.dataset.id);
        const accion = boton.dataset.accion;

        if (accion === 'sumar') cambiarCantidad(id, 1);
        if (accion === 'restar') cambiarCantidad(id, -1);
        if (accion === 'eliminar') eliminarProducto(id);
    });

    btnVaciar?.addEventListener('click', () => {
        if (!carrito.length) return;
        if (confirm('Quieres vaciar el carrito?')) {
            carrito = [];
            guardarCarrito();
            renderizarCarrito();
        }
    });

    btnWhatsApp?.addEventListener('click', () => {
        if (!carrito.length) return;

        const total = carrito.reduce((suma, item) => suma + item.precio * item.cantidad, 0);
        const lineas = [
            `Hola, quiero realizar este ${tituloPedido}:`,
            ''
        ];

        carrito.forEach((item, indice) => {
            lineas.push(`${indice + 1}. ${item.nombre} (${item.marca})`);
            lineas.push(`Cantidad: ${item.cantidad}`);
            if ((item.minimo || 1) > 1) {
                lineas.push(`Minimo de mayoreo: ${item.minimo}`);
            }
            lineas.push(`Subtotal: ${dinero(item.precio * item.cantidad)}`);
            lineas.push('');
        });

        lineas.push(`TOTAL: ${dinero(total)}`);
        lineas.push('');
        lineas.push('Nombre:');
        lineas.push('Direccion o punto de entrega:');

        const numero = String(config.whatsappNumero || '').replace(/\D/g, '');
        if (!numero || numero === '5210000000000') {
            alert('Configura tu numero de WhatsApp en config.php.');
            return;
        }

        const url = `https://wa.me/${numero}?text=${encodeURIComponent(lineas.join('\n'))}`;
        window.open(url, '_blank', 'noopener');
    });

    buscador?.addEventListener('input', () => {
        const termino = buscador.value.trim().toLowerCase();
        document.querySelectorAll('.perfume-item').forEach(item => {
            item.classList.toggle('d-none', !item.dataset.busqueda.includes(termino));
        });
    });

    renderizarCarrito();
})();
