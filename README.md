# free.deft.work

## Descripción

Cuando donas, prestas o regalas un libro con la etiqueta QR que genera este proyecto, estas permitiendo la interacción entre las personas por las que va a pasar el libro. Este proyecto es una aplicación web que permite gestionar y compartir información sobre libros, incluyendo la generación de etiquetas imprimibles con códigos QR para una fácil identificación y acceso. También incorpora un foro para la interacción de los usuarios.

## Características

- Gestión de información de libros (título, autor, ISBN, género, descripción, estado, ID web).
- Generación de etiquetas imprimibles con códigos QR únicos para cada libro.
- Foro de discusión integrado para cada libro, permitiendo a los usuarios interactuar y compartir comentarios.
- Autenticación de usuarios para participar en el foro.

## Tecnologías Utilizadas

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

**[¡Patrocíname!](https://github.com/sponsors/elswork) Juntos seremos imparables.**

Otras formas de financiarme:

[![GitHub Sponsors](https://img.shields.io/github/sponsors/elswork)](https://github.com/sponsors/elswork) [![Donar PayPal](https://img.shields.io/badge/Donar-PayPal-green.svg)](https://www.paypal.com/donate/?business=LFKA5YRJAFYR6&no_recurring=0&item_name=Donación+para+Código+Abierto&currency_code=EUR) [![Donar Coinbase](https://img.shields.io/badge/coinbase-elswork-blue)](https://elswork.cb.id)