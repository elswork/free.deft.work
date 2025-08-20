# ¡Bienvenido a Free.Deft.Work!

![Free Deft Work](https://raw.githubusercontent.com/elswork/free.deft.work/refs/heads/main/client/public/logo192.webp)

## Conecta, Comparte y Descubre: Tu Universo de Contenido

En Free Deft Work, cada pieza de contenido que compartes —ya sea un libro, una película, un videoclip o un video— se convierte en un puente para conectar con otras personas. No solo das nueva vida a una historia o una melodía, sino que tejes una red de conexiones culturales. Imagina esto: cada elemento que añades a tu colección puede ser descubierto por otros, iniciando conversaciones y creando una comunidad en torno a intereses compartidos.

Este innovador proyecto es una aplicación web diseñada para que puedas construir y compartir tu propio universo de contenido. Originalmente centrado en libros viajeros con códigos QR, hemos expandido la plataforma para incluir tus videos, películas y videoclips favoritos de YouTube. Ahora puedes catalogar, descubrir y compartir no solo lecturas, sino también contenido audiovisual, todo en un mismo lugar.

La magia reside en la comunidad. Al participar, te unes a un espacio vibrante donde cada elemento tiene una historia que contar. La plataforma facilita la interacción, permitiéndote seguir a otros usuarios, ver qué están compartiendo y descubrir joyas ocultas a través de sus colecciones. Es un lugar para forjar nuevas amistades a través de pasiones compartidas por la lectura, el cine y la música.

Las ventajas de usar nuestra plataforma son inmensas:

- **Fomenta la interacción social:** Cada libro, película o canción se convierte en un punto de encuentro, conectando a personas con gustos similares.
- **Construye tu identidad digital:** Muestra tus intereses y pasiones a través de las colecciones que creas en tu perfil.
- **Descubre nuevo contenido:** Explora los perfiles de otros usuarios para encontrar tu próxima lectura, película o canción favorita.
- **Centraliza tus intereses:** Organiza todo el contenido que te apasiona en un único lugar, creando un legado digital de tus gustos.
- **Promueve una comunidad cultural:** Participa en un ecosistema donde el intercambio de ideas y recomendaciones enriquece a todos.

En esencia, este proyecto transforma el acto de compartir en una experiencia enriquecedora y conectiva. ¿Estás listo para que tu contenido cuente su propia historia y conecte a personas en el camino?

## Características

- **Gestión de Libros:** Añade libros manualmente o escaneando su ISBN para autocompletar los detalles con la API de Google Books. Genera códigos QR únicos para tus libros viajeros.
- **Colección Multimedia:** Busca y añade videos, películas y videoclips directamente desde YouTube a tu perfil.
- **Perfil de Usuario Personalizado:** Muestra tus colecciones de contenido, tus seguidores y a quiénes sigues.
- **Interacción Social:** Sigue a otros usuarios para descubrir su contenido y permite que otros te sigan.
- **Eliminación de Contenido:** Gestiona tus colecciones eliminando los elementos que ya no desees compartir.
- **Autenticación de Usuarios:** Sistema seguro de registro e inicio de sesión.

## Tecnologías Utilizadas

- **IA** Gemini_cli
- **Frontend:** React (versión 17.x.x)
- **Gestor de Paquetes:** npm
- **Base de Datos y Autenticación:** Google Firebase (Firestore, Authentication)
- **Enrutamiento:** React Router DOM (versión 5.x.x)
- **Generación de QR:** API externa (QR Server)

## Configuración Local

Sigue estos pasos para configurar y ejecutar el proyecto en tu máquina local:

1.  **Clonar el Repositorio:**
    ```bash
    git clone <URL_DEL_REPOSITORIO>
    cd free.deft.work/client
    ```

2.  **Instalar Dependencias:**
    Asegúrate de tener Node.js y npm instalados. Luego, instala las dependencias del proyecto:
    ```bash
    npm install
    ```

3.  **Configurar Variables de Entorno:**
    Crea un fichero `.env` en el directorio `free.deft.work/client` con tus credenciales de Firebase. Puedes obtener estas credenciales desde la consola de Firebase de tu proyecto. El fichero `.env` debe tener el siguiente formato:
    ```
    REACT_APP_FIREBASE_API_KEY=tu_api_key
    REACT_APP_FIREBASE_AUTH_DOMAIN=tu_auth_domain
    REACT_APP_FIREBASE_PROJECT_ID=tu_project_id
    REACT_APP_FIREBASE_STORAGE_BUCKET=tu_storage_bucket
    REACT_APP_FIREBASE_MESSAGING_SENDER_ID=tu_messaging_sender_id
    REACT_APP_FIREBASE_APP_ID=tu_app_id
    REACT_APP_FIREBASE_MEASUREMENT_ID=tu_measurement_id
    ```

4.  **Iniciar la Aplicación:**
    Una vez que las dependencias estén instaladas y las variables de entorno configuradas, puedes iniciar la aplicación en modo de desarrollo:
    ```bash
    npm start
    ```
    La aplicación se abrirá en tu navegador en `http://localhost:3000` (o un puerto disponible).

## Uso

Una vez que la aplicación esté en funcionamiento, podrás:

- Navegar por la lista de libros.
- Añadir nuevos libros, con la opción de escanear el ISBN con la cámara para autocompletar automáticamente el título, autor, descripción y portada del libro a través de la API de Google Books.
- Ver los detalles de cada libro, incluyendo su información y un código QR.
- Imprimir etiquetas de libros (la funcionalidad de impresión utiliza la función nativa del navegador).
- Participar en el foro de cada libro, añadiendo comentarios (requiere inicio de sesión).

## Contribución

Si deseas contribuir a este proyecto, por favor, sigue estos pasos:

1.  Haz un fork del repositorio.
2.  Crea una nueva rama (`git checkout -b feature/nueva-funcionalidad`).
3.  Realiza tus cambios y commitea (`git commit -m 'feat: Añadir nueva funcionalidad'`).
4.  Haz push a tu rama (`git push origin feature/nueva-funcionalidad`).
5.  Abre un Pull Request.

## Licencia

Este proyecto está bajo la licencia MIT. Consulta el fichero `LICENSE` para más detalles.

## Financiamiento y Donaciones

**[¡Patrocíname!](https://github.com/sponsors/elswork) Juntos seremos imparables.**

Otras formas de financiarme:

[![GitHub Sponsors](https://img.shields.io/github/sponsors/elswork)](https://github.com/sponsors/elswork) [![Donar PayPal](https://img.shields.io/badge/Donar-PayPal-green.svg)](https://www.paypal.com/donate/?business=LFKA5YRJAFYR6&no_recurring=0&item_name=Donación+para+Código+Abierto&currency_code=EUR) 
---

**Donar con Bitcoin (BTC):**

`bc1qfxsxxcr2akh2l26m6am0vpwwkhnsua04lmgfef`

[Ver en Blockchain.com](https://www.blockchain.com/btc/address/bc1qfxsxxcr2akh2l26m6am0vpwwkhnsua04lmgfef)

---

**Donar con Ethereum (ETH):**

`0x186b91982CbB6450Af5Ab6F32edf074dFCE8771c`

[Ver en Etherscan](https://etherscan.io/address/0x186b91982CbB6450Af5Ab6F32edf074dFCE8771c)

---

*Ten en cuenta que las donaciones son voluntarias y no son reembolsables. ¡Gracias por tu generosidad!*