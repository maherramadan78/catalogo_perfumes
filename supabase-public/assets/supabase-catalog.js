(() => {
    'use strict';

    const tipo = document.body.dataset.catalogo || 'menudeo';
    const esMayoreo = tipo === 'mayoreo';
    const config = window.CATALOGO_CONFIG || {};
    const carritoKey = `carrito_supabase_${tipo}_v1`;

    let supabaseClient = null;
    let carrito = cargarCarrito();
    let catalogoCargado = false;

    const estado = document.getElementById('estadoCatalogo');
    const lista = document.getElementById('listaPerfumes');
    const buscador = document.getElementById('buscador');
    const contador = document.getElementById('contadorCarrito');
    const itemsContenedor = document.getElementById('itemsCarrito');
    const carritoVacio = document.getElementById('carritoVacio');
    const totalElemento = document.getElementById('totalCarrito');
    const btnWhatsApp = document.getElementById('btnWhatsApp');
    const btnVaciar = document.getElementById('btnVaciar');

    function configLista() {
        const supabaseConfig = window.SUPABASE_CONFIG || {};
        return supabaseConfig.url
            && supabaseConfig.anonKey
            && !String(supabaseConfig.url).includes('PEGA_AQUI')
            && !String(supabaseConfig.anonKey).includes('PEGA_AQUI');
    }

    function iniciarSupabase() {
        if (!window.supabase || !window.supabase.createClient) {
            mostrarEstado('No se pudo cargar la libreria de Supabase.', 'danger');
            return false;
        }

        if (!configLista()) {
            mostrarEstado('Configura Supabase en supabase-config.js antes de usar este catalogo.', 'warning');
            return false;
        }

        supabaseClient = window.supabase.createClient(
            window.SUPABASE_CONFIG.url,
            window.SUPABASE_CONFIG.anonKey,
            {
                auth: {
                    autoRefreshToken: true,
                    persistSession: true,
                    detectSessionInUrl: false
                }
            }
        );
        return true;
    }

    function mostrarEstado(mensaje, tipoAlerta = 'info') {
        if (!estado) return;
        estado.className = `alert alert-${tipoAlerta}`;
        estado.textContent = mensaje;
        estado.classList.remove('d-none');
    }

    function ocultarEstado() {
        estado?.classList.add('d-none');
    }

    function dinero(valor) {
        return new Intl.NumberFormat('es-MX', {
            style: 'currency',
            currency: config.moneda || 'MXN'
        }).format(valor || 0);
    }

    function cargarCarrito() {
        try {
            const datos = JSON.parse(localStorage.getItem(carritoKey));
            return Array.isArray(datos) ? datos : [];
        } catch {
            return [];
        }
    }

    function guardarCarrito() {
        localStorage.setItem(carritoKey, JSON.stringify(carrito));
    }

    function escapeHtml(valor) {
        return String(valor ?? '')
            .replaceAll('&', '&amp;')
            .replaceAll('<', '&lt;')
            .replaceAll('>', '&gt;')
            .replaceAll('"', '&quot;')
            .replaceAll("'", '&#039;');
    }

    function productoDesdeRow(data) {
        const precio = esMayoreo ? Number(data.precio_mayoreo || 0) : Number(data.precio || 0);
        const minimo = esMayoreo ? Math.max(1, Number(data.minimo_mayoreo || 1)) : 1;

        return {
            id: data.id,
            nombre: data.nombre || '',
            marca: data.marca || '',
            descripcion: data.descripcion || '',
            categoria: data.categoria || '',
            precio,
            foto: data.foto_url || 'assets/sin-foto.svg',
            stock: Number(data.stock || 0),
            destacado: data.destacado === true,
            minimo
        };
    }

    async function cargarCatalogo() {
        mostrarEstado('Cargando catalogo...');

        const campoActivo = esMayoreo ? 'activo_mayoreo' : 'activo';
        const campoPrecio = esMayoreo ? 'precio_mayoreo' : 'precio';
        const { data, error } = await supabaseClient
            .from('productos')
            .select('id,nombre,marca,descripcion,categoria,precio,precio_mayoreo,minimo_mayoreo,foto_url,stock,destacado,activo,activo_mayoreo')
            .eq(campoActivo, true)
            .gt(campoPrecio, 0)
            .order('destacado', { ascending: false })
            .order('nombre', { ascending: true });

        if (error) throw error;

        const productos = (data || [])
            .map(productoDesdeRow)
            .filter(p => p.precio > 0);

        if (!productos.length) {
            mostrarEstado(esMayoreo ? 'Todavia no hay productos de mayoreo.' : 'Todavia no hay productos publicados.');
            lista.innerHTML = '';
            return;
        }

        ocultarEstado();
        lista.innerHTML = productos.map(renderProducto).join('');
        conectarBotonesProducto();
        catalogoCargado = true;
    }

    function renderProducto(p) {
        const agotado = p.stock <= 0 || p.stock < p.minimo;
        const busqueda = `${p.nombre} ${p.marca} ${p.categoria}`.toLowerCase();
        const stockBadge = agotado
            ? '<span class="badge text-bg-secondary etiqueta-stock">Agotado</span>'
            : esMayoreo
                ? `<span class="badge text-bg-success etiqueta-stock">Min. ${p.minimo} pzas</span>`
                : p.stock <= 5
                    ? '<span class="badge text-bg-danger etiqueta-stock">Ultimas unidades</span>'
                    : '';

        return `
            <div class="col-12 col-sm-6 col-lg-4 col-xl-3 perfume-item" data-busqueda="${escapeHtml(busqueda)}">
                <article class="card h-100 perfume-card border-0 shadow-sm">
                    <div class="foto-wrap">
                        <img src="${escapeHtml(p.foto)}" class="card-img-top perfume-foto" alt="${escapeHtml(p.nombre)}" onerror="this.src='assets/sin-foto.svg'">
                        ${stockBadge}
                    </div>
                    <div class="card-body d-flex flex-column">
                        <div class="small text-uppercase text-secondary fw-semibold">${escapeHtml(p.marca)}</div>
                        <h2 class="h5 mt-1">${escapeHtml(p.nombre)}</h2>
                        <p class="small text-secondary flex-grow-1">${escapeHtml(p.descripcion)}</p>
                        <div class="mb-3">
                            <span class="precio ${esMayoreo ? 'text-success' : ''}">${dinero(p.precio)}</span>
                            <div class="small text-secondary">Stock: ${p.stock}${esMayoreo ? ` | Minimo: ${p.minimo}` : ''}</div>
                        </div>
                        <div class="input-group mb-2">
                            <button class="btn btn-outline-secondary btn-restar" type="button">-</button>
                            <input class="form-control text-center cantidad" type="number" min="${p.minimo}" max="${Math.max(p.minimo, p.stock)}" value="${p.minimo}" ${agotado ? 'disabled' : ''}>
                            <button class="btn btn-outline-secondary btn-sumar" type="button">+</button>
                        </div>
                        <button class="btn ${esMayoreo ? 'btn-success' : 'btn-warning'} fw-semibold btn-agregar" type="button" ${agotado ? 'disabled' : ''}
                            data-id="${escapeHtml(p.id)}"
                            data-nombre="${escapeHtml(p.nombre)}"
                            data-marca="${escapeHtml(p.marca)}"
                            data-precio="${p.precio}"
                            data-foto="${escapeHtml(p.foto)}"
                            data-stock="${p.stock}"
                            data-minimo="${p.minimo}">
                            ${esMayoreo ? 'Agregar mayoreo' : 'Agregar al carrito'}
                        </button>
                    </div>
                </article>
            </div>
        `;
    }

    function conectarBotonesProducto() {
        document.querySelectorAll('.btn-agregar').forEach(boton => {
            boton.addEventListener('click', () => {
                const tarjeta = boton.closest('.card');
                const input = tarjeta.querySelector('.cantidad');
                const minimo = Number(input.min || boton.dataset.minimo || 1);
                const cantidad = Math.max(minimo, Number.parseInt(input.value, 10) || minimo);
                const producto = {
                    id: boton.dataset.id,
                    nombre: boton.dataset.nombre,
                    marca: boton.dataset.marca,
                    precio: Number(boton.dataset.precio),
                    foto: boton.dataset.foto,
                    stock: Number(boton.dataset.stock),
                    minimo: Number(boton.dataset.minimo || 1)
                };

                agregarProducto(producto, cantidad);
                const texto = boton.textContent;
                boton.textContent = 'Agregado';
                setTimeout(() => { boton.textContent = texto; }, 900);
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
    }

    function agregarProducto(producto, cantidad) {
        const existente = carrito.find(item => item.id === producto.id);
        const nuevaCantidad = (existente ? existente.cantidad : 0) + cantidad;

        if (nuevaCantidad > producto.stock) {
            alert(`Solo hay ${producto.stock} unidad(es) disponibles.`);
            return;
        }

        if (existente) {
            existente.cantidad = nuevaCantidad;
        } else {
            carrito.push({ ...producto, cantidad });
        }

        guardarCarrito();
        renderCarrito();
    }

    function cambiarCantidad(id, cambio) {
        const item = carrito.find(p => p.id === id);
        if (!item) return;
        const minimo = Math.max(1, Number(item.minimo || 1));
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
        renderCarrito();
    }

    function eliminarProducto(id) {
        carrito = carrito.filter(item => item.id !== id);
        guardarCarrito();
        renderCarrito();
    }

    function renderCarrito() {
        if (!contador || !itemsContenedor || !totalElemento || !carritoVacio || !btnWhatsApp || !btnVaciar) return;
        itemsContenedor.innerHTML = '';
        const cantidadTotal = carrito.reduce((suma, item) => suma + item.cantidad, 0);
        const total = carrito.reduce((suma, item) => suma + item.precio * item.cantidad, 0);

        contador.textContent = cantidadTotal;
        totalElemento.textContent = dinero(total);
        carritoVacio.classList.toggle('d-none', carrito.length > 0);
        btnWhatsApp.disabled = carrito.length === 0;
        btnVaciar.disabled = carrito.length === 0;

        carrito.forEach(item => {
            const bloque = document.createElement('div');
            bloque.className = 'item-carrito border-bottom pb-3';
            bloque.innerHTML = `
                <img src="${escapeHtml(item.foto)}" alt="">
                <div>
                    <div class="fw-semibold">${escapeHtml(item.nombre)}</div>
                    <div class="small text-secondary">${escapeHtml(item.marca)}</div>
                    <div class="small">${dinero(item.precio)} c/u</div>
                    ${item.minimo > 1 ? `<div class="small text-success">Minimo: ${item.minimo} pzas</div>` : ''}
                    <div class="item-controles mt-2">
                        <button class="btn btn-outline-secondary btn-sm" data-accion="restar" data-id="${escapeHtml(item.id)}">-</button>
                        <span class="fw-semibold">${item.cantidad}</span>
                        <button class="btn btn-outline-secondary btn-sm" data-accion="sumar" data-id="${escapeHtml(item.id)}">+</button>
                    </div>
                </div>
                <div class="text-end">
                    <div class="fw-bold">${dinero(item.precio * item.cantidad)}</div>
                    <button class="btn btn-link btn-sm text-danger p-0 mt-2" data-accion="eliminar" data-id="${escapeHtml(item.id)}">Quitar</button>
                </div>
            `;
            itemsContenedor.appendChild(bloque);
        });
    }

    itemsContenedor?.addEventListener('click', evento => {
        const boton = evento.target.closest('button[data-accion]');
        if (!boton) return;
        if (boton.dataset.accion === 'sumar') cambiarCantidad(boton.dataset.id, 1);
        if (boton.dataset.accion === 'restar') cambiarCantidad(boton.dataset.id, -1);
        if (boton.dataset.accion === 'eliminar') eliminarProducto(boton.dataset.id);
    });

    btnVaciar?.addEventListener('click', () => {
        if (!carrito.length) return;
        if (confirm('Quieres vaciar el carrito?')) {
            carrito = [];
            guardarCarrito();
            renderCarrito();
        }
    });

    btnWhatsApp?.addEventListener('click', () => {
        const numero = String(config.whatsappNumero || '').replace(/\D/g, '');
        if (!numero || numero === '5210000000000') {
            alert('Configura tu numero de WhatsApp en supabase-config.js.');
            return;
        }

        const total = carrito.reduce((suma, item) => suma + item.precio * item.cantidad, 0);
        const titulo = esMayoreo ? 'Pedido de mayoreo' : 'Pedido de menudeo';
        const lineas = [`Hola, quiero realizar este ${titulo}:`, ''];
        carrito.forEach((item, indice) => {
            lineas.push(`${indice + 1}. ${item.nombre} (${item.marca})`);
            lineas.push(`Cantidad: ${item.cantidad}`);
            if (item.minimo > 1) lineas.push(`Minimo de mayoreo: ${item.minimo}`);
            lineas.push(`Subtotal: ${dinero(item.precio * item.cantidad)}`);
            lineas.push('');
        });
        lineas.push(`TOTAL: ${dinero(total)}`, '', 'Nombre:', 'Direccion o punto de entrega:');
        window.open(`https://wa.me/${numero}?text=${encodeURIComponent(lineas.join('\n'))}`, '_blank', 'noopener');
    });

    buscador?.addEventListener('input', () => {
        const termino = buscador.value.trim().toLowerCase();
        document.querySelectorAll('.perfume-item').forEach(item => {
            item.classList.toggle('d-none', !item.dataset.busqueda.includes(termino));
        });
    });

    async function mostrarMayoreo(session) {
        const login = document.getElementById('panelLogin');
        const panel = document.getElementById('panelCatalogo');
        const btnSalir = document.getElementById('btnSalir');
        const btnCarrito = document.getElementById('btnCarrito');

        if (!session || !session.user) {
            catalogoCargado = false;
            login?.classList.remove('d-none');
            panel?.classList.add('d-none');
            buscador?.classList.add('d-none');
            btnSalir?.classList.add('d-none');
            btnCarrito?.classList.add('d-none');
            return;
        }

        login?.classList.add('d-none');
        panel?.classList.remove('d-none');
        buscador?.classList.remove('d-none');
        btnSalir?.classList.remove('d-none');
        btnCarrito?.classList.remove('d-none');

        if (!catalogoCargado) {
            try {
                await cargarCatalogo();
            } catch (err) {
                mostrarEstado('No se pudo cargar mayoreo. Revisa las reglas de Supabase y que el usuario tenga acceso.', 'danger');
            }
        }
    }

    async function iniciarMayoreo() {
        const form = document.getElementById('formLogin');
        const error = document.getElementById('loginError');
        const btnSalir = document.getElementById('btnSalir');

        form?.addEventListener('submit', async evento => {
            evento.preventDefault();
            error?.classList.add('d-none');
            const { error: authError } = await supabaseClient.auth.signInWithPassword({
                email: document.getElementById('emailMayoreo').value.trim().toLowerCase(),
                password: document.getElementById('passwordMayoreo').value
            });

            if (authError) {
                error.textContent = 'No se pudo iniciar sesion. Revisa email y contrasena.';
                error.classList.remove('d-none');
            }
        });

        btnSalir?.addEventListener('click', () => supabaseClient.auth.signOut());

        const { data } = await supabaseClient.auth.getSession();
        await mostrarMayoreo(data.session);
        supabaseClient.auth.onAuthStateChange((_event, session) => {
            mostrarMayoreo(session);
        });
    }

    if (!iniciarSupabase()) return;

    renderCarrito();

    if (esMayoreo) {
        iniciarMayoreo();
    } else {
        cargarCatalogo().catch(() => {
            mostrarEstado('No se pudo cargar el catalogo. Revisa Supabase y las reglas.', 'danger');
        });
    }
})();
