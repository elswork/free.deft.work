# ¡Bienvenido a Free.Deft.Work!

![Free Deft Work](https://raw.githubusercontent.com/elswork/free.deft.work/refs/heads/main/client/public/logo192.webp)

## Conecta y Comparte: El Poder de un Libro Viajero

Cuando compartes un libro con el código QR único generado por nuestro proyecto, no solo estás dando vida a una historia, sino que también estás tejiendo una red de conexiones entre personas. Imagina esto: cada vez que ese libro pasa de mano en mano, ya sea por donación, préstamo o como un regalo pensado, se convierte en un vehículo de interacción humana.

Este innovador proyecto es una aplicación web diseñada para revolucionar la forma en que gestionamos y compartimos información sobre libros. Su corazón reside en la generación de etiquetas imprimibles con códigos QR, haciendo que la identificación y el acceso a los detalles del libro sean increíblemente fáciles. Simplemente escanea el código y descubre el viaje que ha hecho, quién lo ha leído antes y quizás, las impresiones que ha dejado.

Pero la magia no termina ahí. Al participar, te unes a una comunidad vibrante donde cada libro tiene una historia que contar, más allá de sus páginas. Nuestro proyecto incorpora un foro interactivo donde los usuarios pueden compartir sus pensamientos, debatir ideas, descubrir nuevas lecturas y forjar nuevas amistades a través de la pasión compartida por los libros.

Las ventajas de compartir tus libros con nuestro sistema son inmensas:

Fomenta la interacción social: Cada libro se convierte en un punto de encuentro, conectando a lectores de diferentes orígenes y experiencias.

Construye comunidades: Un foro dedicado permite el diálogo, el intercambio de recomendaciones y la creación de lazos entre amantes de la lectura.

Alarga la vida de los libros: Al darles un propósito continuo, reduces el desperdicio y promueves un consumo más sostenible.

Democratiza el acceso a la lectura: Libros que quizás estarían acumulando polvo, ahora pueden llegar a nuevas manos y mentes.

Descubre nuevas perspectivas: Ver cómo otros interactúan con un libro que has compartido puede enriquecer tu propia comprensión y aprecio.

Crea un legado literario: Tus libros no solo se leen, sino que se convierten en parte de una historia más grande, documentada a través de sus viajes.

Promueve la economía circular: En lugar de comprar siempre libros nuevos, se fomenta el intercambio y el aprovechamiento de recursos existentes.

En esencia, este proyecto transforma un acto simple como compartir un libro en una experiencia enriquecedora y conectiva. ¿Estás listo para que tus libros cuenten su propia historia y conecten a personas en el camino?

## Características

- Gestión de información de libros (título, autor, ISBN, género, descripción, estado, ID web).
- Escaneo de ISBN con cámara y autocompletado automático de detalles del libro (título, autor, descripción, portada) usando la API de Google Books.
- Generación de etiquetas imprimibles con códigos QR únicos para cada libro.
- Foro de discusión integrado para cada libro, permitiendo a los usuarios interactuar y compartir comentarios.
- Autenticación de usuarios para participar en el foro.

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