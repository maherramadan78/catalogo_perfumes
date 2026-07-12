(() => {
    'use strict';

    let supabaseClient = null;
    let productos = [];
    let fotoActual = '';
    let sesionActual = null;
    const adminEmail = String((window.CATALOGO_CONFIG || {}).adminEmail || '').toLowerCase();

    const adminLogin = document.getElementById('adminLogin');
    const adminPanel = document.getElementById('adminPanel');
    const formLogin = document.getElementById('formAdminLogin');
    const loginError = document.getElementById('adminLoginError');
    const btnSalir = document.getElementById('btnSalirAdmin');
    const formProducto = document.getElementById('formProducto');
    const listaAdmin = document.getElementById('listaAdmin');
    const adminEstado = document.getElementById('adminEstado');
    const btnCancelar = document.getElementById('btnCancelarEdicion');
    const btnImportarSeed = document.getElementById('btnImportarSeed');
    const adminCorreoPermitido = document.getElementById('adminCorreoPermitido');
    const adminCorreoActivo = document.getElementById('adminCorreoActivo');

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
            mostrarEstado('Configura Supabase en supabase-config.js antes de usar el admin.', 'warning');
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

    function mostrarEstado(mensaje, tipo = 'info') {
        adminEstado.className = `alert alert-${tipo}`;
        adminEstado.textContent = mensaje;
        adminEstado.classList.remove('d-none');
    }

    function ocultarEstado() {
        adminEstado.classList.add('d-none');
    }

    function correoActual() {
        return String((sesionActual && sesionActual.user && sesionActual.user.email) || '').toLowerCase();
    }

    function actualizarCorreos(session = null) {
        sesionActual = session;
        if (adminCorreoPermitido) adminCorreoPermitido.textContent = adminEmail || 'no configurado';
        if (adminCorreoActivo) adminCorreoActivo.textContent = correoActual() || 'sin sesion';
    }

    function esErrorPermisos(err) {
        const texto = `${err && err.code ? err.code : ''} ${err && err.message ? err.message : ''}`.toLowerCase();
        return texto.includes('permission')
            || texto.includes('unauthorized')
            || texto.includes('row-level')
            || texto.includes('policy')
            || texto.includes('not allowed');
    }

    function mensajeOperacion(err, accion) {
        if (!esErrorPermisos(err)) {
            return (err && err.message) || `No se pudo ${accion}.`;
        }

        const actual = correoActual() || 'sin sesion';
        const permitido = adminEmail || 'no configurado';
        return `No se pudo ${accion}. Supabase te reconoce como ${actual}. El admin permitido es ${permitido}. Si no son iguales, sal y entra con el correo admin exacto. Si son iguales, revisa que ya corriste supabase/schema.sql.`;
    }

    function escapeHtml(valor) {
        return String(valor ?? '')
            .replaceAll('&', '&amp;')
            .replaceAll('<', '&lt;')
            .replaceAll('>', '&gt;')
            .replaceAll('"', '&quot;')
            .replaceAll("'", '&#039;');
    }

    function dinero(valor) {
        return new Intl.NumberFormat('es-MX', {
            style: 'currency',
            currency: (window.CATALOGO_CONFIG || {}).moneda || 'MXN'
        }).format(valor || 0);
    }

    function valor(id) {
        return document.getElementById(id).value.trim();
    }

    function numero(id) {
        return Math.max(0, Number(document.getElementById(id).value || 0));
    }

    function checked(id) {
        return document.getElementById(id).checked;
    }

    function limpiarFormulario() {
        formProducto.reset();
        document.getElementById('productoId').value = '';
        document.getElementById('categoria').value = 'Unisex';
        document.getElementById('minimoMayoreo').value = 6;
        document.getElementById('stock').value = 1;
        document.getElementById('activo').checked = true;
        document.getElementById('activoMayoreo').checked = true;
        fotoActual = '';
    }

    function datosFormulario() {
        const nombre = valor('nombre');
        const marca = valor('marca');
        const precio = numero('precio');
        const precioMayoreo = numero('precioMayoreo');
        const minimoMayoreo = Math.max(1, Number(document.getElementById('minimoMayoreo').value || 1));

        if (!nombre || !marca) throw new Error('Nombre y marca son obligatorios.');
        if (precio <= 0) throw new Error('El precio de menudeo debe ser mayor a cero.');
        if (checked('activoMayoreo') && precioMayoreo <= 0) {
            throw new Error('El precio de mayoreo debe ser mayor a cero.');
        }

        return {
            nombre,
            marca,
            descripcion: valor('descripcion'),
            categoria: valor('categoria') || 'Unisex',
            precio,
            precio_mayoreo: precioMayoreo,
            minimo_mayoreo: minimoMayoreo,
            stock: Math.max(0, Number(document.getElementById('stock').value || 0)),
            destacado: checked('destacado'),
            activo: checked('activo'),
            activo_mayoreo: checked('activoMayoreo')
        };
    }

    function extensionSegura(nombre) {
        const extension = String(nombre || '').split('.').pop().toLowerCase();
        return ['jpg', 'jpeg', 'png', 'webp'].includes(extension) ? extension : 'jpg';
    }

    async function subirFotoSiExiste(idProducto) {
        const input = document.getElementById('foto');
        const archivo = input.files && input.files[0];
        if (!archivo) return fotoActual || 'assets/sin-foto.svg';

        if (!archivo.type.startsWith('image/')) throw new Error('La foto debe ser una imagen.');
        if (archivo.size > 5 * 1024 * 1024) throw new Error('La foto no debe pasar de 5 MB.');

        const extension = extensionSegura(archivo.name);
        const ruta = `${idProducto}/${Date.now()}.${extension}`;
        const { data, error } = await supabaseClient.storage
            .from('productos')
            .upload(ruta, archivo, {
                cacheControl: '3600',
                contentType: archivo.type,
                upsert: false
            });

        if (error) throw error;

        const { data: publicData } = supabaseClient.storage
            .from('productos')
            .getPublicUrl(data.path);

        return publicData.publicUrl;
    }

    async function guardarProducto(evento) {
        evento.preventDefault();

        try {
            mostrarEstado('Guardando producto...');
            const idActual = document.getElementById('productoId').value;
            const id = idActual || `producto_${Date.now()}`;
            const datos = datosFormulario();
            const fotoUrl = await subirFotoSiExiste(id);
            const completo = {
                id,
                ...datos,
                foto_url: fotoUrl,
                updated_at: new Date().toISOString()
            };

            const { error } = await supabaseClient
                .from('productos')
                .upsert(completo, { onConflict: 'id' });

            if (error) throw error;

            limpiarFormulario();
            await cargarProductos();
            mostrarEstado('Producto guardado.', 'success');
        } catch (err) {
            mostrarEstado(mensajeOperacion(err, 'guardar el producto'), 'danger');
        }
    }

    async function cargarProductos() {
        mostrarEstado('Cargando productos...');
        const { data, error } = await supabaseClient
            .from('productos')
            .select('*')
            .order('destacado', { ascending: false })
            .order('nombre', { ascending: true });

        if (error) throw error;

        productos = data || [];

        if (!productos.length) {
            listaAdmin.innerHTML = '';
            mostrarEstado('No hay productos en Supabase. Puedes importar datos iniciales.', 'info');
            return;
        }

        listaAdmin.innerHTML = productos.map(renderProductoAdmin).join('');
        ocultarEstado();
    }

    function renderProductoAdmin(p) {
        const visible = p.activo || p.activo_mayoreo;
        const foto = p.foto_url || 'assets/sin-foto.svg';

        return `
            <article class="admin-product ${visible ? '' : 'is-disabled'}">
                <div class="admin-product-photo">
                    <img src="${escapeHtml(foto)}" alt="${escapeHtml(p.nombre)}" onerror="this.src='assets/sin-foto.svg'">
                </div>
                <div class="admin-product-fields">
                    <h3 class="h5 mb-1">${escapeHtml(p.nombre)}</h3>
                    <div class="text-secondary mb-2">${escapeHtml(p.marca)} | ${escapeHtml(p.categoria || '')}</div>
                    <div class="row g-2">
                        <div class="col-6 col-md-3"><strong>Menudeo</strong><br>${dinero(p.precio)}</div>
                        <div class="col-6 col-md-3"><strong>Mayoreo</strong><br>${dinero(p.precio_mayoreo)}</div>
                        <div class="col-6 col-md-3"><strong>Minimo</strong><br>${Number(p.minimo_mayoreo || 1)} pzas</div>
                        <div class="col-6 col-md-3"><strong>Stock</strong><br>${Number(p.stock || 0)}</div>
                    </div>
                </div>
                <div class="admin-product-actions">
                    <span class="badge ${p.activo ? 'text-bg-warning' : 'text-bg-secondary'}">Menudeo</span>
                    <span class="badge ${p.activo_mayoreo ? 'text-bg-success' : 'text-bg-secondary'}">Mayoreo</span>
                    <button class="btn btn-dark w-100" type="button" data-editar="${escapeHtml(p.id)}">Editar</button>
                    <button class="btn ${visible ? 'btn-outline-danger' : 'btn-outline-success'} w-100" type="button" data-toggle="${escapeHtml(p.id)}" data-visible="${visible ? '1' : '0'}">
                        ${visible ? 'Ocultar todo' : 'Activar todo'}
                    </button>
                </div>
            </article>
        `;
    }

    function editarProducto(id) {
        const p = productos.find(item => item.id === id);
        if (!p) return;
        document.getElementById('productoId').value = p.id;
        document.getElementById('nombre').value = p.nombre || '';
        document.getElementById('marca').value = p.marca || '';
        document.getElementById('categoria').value = p.categoria || 'Unisex';
        document.getElementById('precio').value = Number(p.precio || 0).toFixed(2);
        document.getElementById('precioMayoreo').value = Number(p.precio_mayoreo || 0).toFixed(2);
        document.getElementById('minimoMayoreo').value = Number(p.minimo_mayoreo || 1);
        document.getElementById('stock').value = Number(p.stock || 0);
        document.getElementById('descripcion').value = p.descripcion || '';
        document.getElementById('destacado').checked = p.destacado === true;
        document.getElementById('activo').checked = p.activo === true;
        document.getElementById('activoMayoreo').checked = p.activo_mayoreo === true;
        document.getElementById('foto').value = '';
        fotoActual = p.foto_url || '';
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    async function cambiarVisibilidad(id, visible) {
        const nuevo = !visible;
        mostrarEstado(nuevo ? 'Activando producto...' : 'Ocultando producto...');
        const { error } = await supabaseClient
            .from('productos')
            .update({
                activo: nuevo,
                activo_mayoreo: nuevo,
                updated_at: new Date().toISOString()
            })
            .eq('id', id);

        if (error) {
            mostrarEstado(mensajeOperacion(error, 'cambiar visibilidad'), 'danger');
            return;
        }

        await cargarProductos();
    }

    async function importarSeed() {
        try {
            mostrarEstado('Importando datos iniciales...');
            const respuesta = await fetch('seed-products.json', { cache: 'no-store' });
            if (!respuesta.ok) throw new Error('No se encontro seed-products.json.');
            const seed = await respuesta.json();
            const rows = seed.map(item => ({
                id: item.id || `producto_${Date.now()}`,
                nombre: item.nombre || '',
                marca: item.marca || '',
                descripcion: item.descripcion || '',
                categoria: item.categoria || 'Unisex',
                precio: Number(item.precio || 0),
                precio_mayoreo: Number(item.precio_mayoreo || 0),
                minimo_mayoreo: Math.max(1, Number(item.minimo_mayoreo || 1)),
                foto_url: item.fotoUrl || item.foto_url || 'assets/sin-foto.svg',
                stock: Number(item.stock || 0),
                destacado: item.destacado === true,
                activo: item.activo !== false,
                activo_mayoreo: item.activo_mayoreo !== false,
                updated_at: new Date().toISOString()
            }));

            const { error } = await supabaseClient
                .from('productos')
                .upsert(rows, { onConflict: 'id' });

            if (error) throw error;

            await cargarProductos();
            mostrarEstado('Datos iniciales importados.', 'success');
        } catch (err) {
            mostrarEstado(mensajeOperacion(err, 'importar datos'), 'danger');
        }
    }

    listaAdmin?.addEventListener('click', async evento => {
        const editar = evento.target.closest('[data-editar]');
        if (editar) editarProducto(editar.dataset.editar);

        const toggle = evento.target.closest('[data-toggle]');
        if (toggle) {
            await cambiarVisibilidad(toggle.dataset.toggle, toggle.dataset.visible === '1');
        }
    });

    formLogin?.addEventListener('submit', async evento => {
        evento.preventDefault();
        loginError.classList.add('d-none');

        const email = document.getElementById('adminEmail').value.trim().toLowerCase();

        if (!adminEmail || email !== adminEmail) {
            loginError.textContent = 'Este correo no tiene permiso de admin. Usa solo el correo admin autorizado.';
            loginError.classList.remove('d-none');
            document.getElementById('adminPassword').value = '';
            await supabaseClient.auth.signOut();
            return;
        }

        const { error } = await supabaseClient.auth.signInWithPassword({
            email,
            password: document.getElementById('adminPassword').value
        });

        if (error) {
            loginError.textContent = 'No se pudo iniciar sesion. Revisa email y contrasena.';
            loginError.classList.remove('d-none');
        }
    });

    async function mostrarSesion(session) {
        actualizarCorreos(session);

        if (!session || !session.user) {
            adminLogin.classList.remove('d-none');
            adminPanel.classList.add('d-none');
            btnSalir.classList.add('d-none');
            return;
        }

        if (adminEmail && String(session.user.email || '').toLowerCase() !== adminEmail) {
            adminLogin.classList.remove('d-none');
            adminPanel.classList.add('d-none');
            btnSalir.classList.add('d-none');
            loginError.textContent = 'Este usuario solo puede ver el catalogo y hacer pedidos. No tiene acceso al admin.';
            loginError.classList.remove('d-none');
            await supabaseClient.auth.signOut();
            return;
        }

        adminLogin.classList.add('d-none');
        adminPanel.classList.remove('d-none');
        btnSalir.classList.remove('d-none');

        try {
            await cargarProductos();
        } catch (err) {
            mostrarEstado(mensajeOperacion(err, 'cargar productos'), 'danger');
        }
    }

    btnSalir?.addEventListener('click', () => supabaseClient.auth.signOut());
    formProducto?.addEventListener('submit', guardarProducto);
    btnCancelar?.addEventListener('click', limpiarFormulario);
    btnImportarSeed?.addEventListener('click', importarSeed);

    if (!iniciarSupabase()) return;
    actualizarCorreos();

    supabaseClient.auth.getSession().then(({ data }) => {
        mostrarSesion(data.session);
    });

    supabaseClient.auth.onAuthStateChange((_event, session) => {
        mostrarSesion(session);
    });
})();
