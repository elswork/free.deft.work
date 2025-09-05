import React, { useState, useEffect, useCallback } from 'react';
import { collection, addDoc, onSnapshot, query, doc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { useHistory } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faExternalLinkAlt, faEdit, faTrashAlt, faPlus, faSave, faTimes, faShareAlt, faCamera } from '@fortawesome/free-solid-svg-icons';
import { Html5QrcodeScanner } from 'html5-qrcode';
import axios from 'axios';



// Function to generate a unique 5-character alphanumeric code
const generateUniqueCode = () => {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 5; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
};

function BookList({ auth, db, storage }) {
  const [books, setBooks] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [newBook, setNewBook] = useState({
    title: '',
    author: '',
    isbn: '',
    genre: '',
    description: '',
    status: 'disponible',
    imageUrl: '',
  });
  const [imageFile, setImageFile] = useState(null);
  const [editingBookId, setEditingBookId] = useState(null);
  const [showScanner, setShowScanner] = useState(false);
  const history = useHistory();

  const fetchBookDetails = useCallback(async (isbn) => {
    try {
      const response = await axios.get(`https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}`);
      const bookData = response.data.items[0]?.volumeInfo;

      if (bookData) {
        setNewBook(prev => ({
          ...prev,
          title: bookData.title || '',
          author: bookData.authors ? bookData.authors.join(', ') : '',
          description: bookData.description || '',
          imageUrl: bookData.imageLinks?.thumbnail || '',
          isbn: isbn,
        }));
      } else {
        alert("No se encontraron detalles para este ISBN.");
      }
    } catch (error) {
      console.error("Error fetching book details:", error);
      alert("Error al buscar detalles del libro. Inténtalo manualmente.");
    }
  }, []);

  const onScanSuccess = useCallback((decodedText, decodedResult) => {
    console.log(`Code matched = ${decodedText}`, decodedResult);
    setNewBook(prev => ({ ...prev, isbn: decodedText }));
    fetchBookDetails(decodedText);
    setShowScanner(false);
  }, [fetchBookDetails]);

  useEffect(() => {
    if (auth.currentUser) {
      const q = query(collection(db, "books"));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const booksData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setBooks(booksData);
      });
      return () => unsubscribe();
    }
  }, [auth.currentUser, db]);

  useEffect(() => {
    let html5QrcodeScanner;
    if (showScanner) {
      html5QrcodeScanner = new Html5QrcodeScanner(
        "reader", {
          fps: 10,
          qrbox: { width: 250, height: 250 }
        },
        false
      );
      html5QrcodeScanner.render(onScanSuccess, onScanError);
    }

    return () => {
      if (html5QrcodeScanner && html5QrcodeScanner.clear) {
        html5QrcodeScanner.clear().catch(error => {
          console.error("Failed to clear html5QrcodeScanner. ", error);
        });
      }
    };
  }, [showScanner, onScanSuccess]);

  const onScanError = (error) => {
    // console.warn(`Code scan error = ${error}`);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewBook({ ...newBook, [name]: value });
    if (name === "isbn" && value.length === 13) { // Asumiendo ISBN-13
      fetchBookDetails(value);
    }
  };

  const handleImageChange = (e) => {
    if (e.target.files[0]) {
      setImageFile(e.target.files[0]);
    }
  };

  const handleAddOrUpdateBook = async (e) => {
    e.preventDefault();
    let imageUrl = newBook.imageUrl;

    if (imageFile) {
      const storageRef = ref(storage, `book_images/${imageFile.name}`);
      await uploadBytes(storageRef, imageFile);
      imageUrl = await getDownloadURL(storageRef);
    }

    try {
      if (editingBookId) {
        const bookRef = doc(db, "books", editingBookId);
        await updateDoc(bookRef, { ...newBook, imageUrl });
        setEditingBookId(null);
      } else {
        const webId = generateUniqueCode();
        await addDoc(collection(db, "books"), { ...newBook, imageUrl, ownerId: auth.currentUser.uid, webId, createdAt: serverTimestamp() });
      }
      setNewBook({
        title: '',
        author: '',
        isbn: '',
        genre: '',
        description: '',
        status: 'disponible',
        imageUrl: '',
      });
      setImageFile(null);
    } catch (error) {
      console.error("Error adding/updating document: ", error);
    }
  };

  const handleEditClick = (book) => {
    setNewBook(book);
    setEditingBookId(book.id);
  };

  const handleDeleteClick = async (bookId, imageUrl) => {
    if (window.confirm("¿Estás seguro de que quieres eliminar este libro?")) {
      try {
        await deleteDoc(doc(db, "books", bookId));
        if (imageUrl) {
          const imageRef = ref(storage, imageUrl);
          await deleteObject(imageRef);
        }
      } catch (error) {
        console.error("Error deleting document: ", error);
      }
    }
  };

  const filteredBooks = books.filter(book =>
    book.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    book.author.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="mt-4">
      <h2 className="mb-3">{editingBookId ? "Editar Libro" : "Añadir Nuevo Libro"}</h2>
      <form onSubmit={handleAddOrUpdateBook} className="mb-5">
        <div className="mb-3">
          <input type="text" name="isbn" className="form-control" placeholder="ISBN" value={newBook.isbn} onChange={handleInputChange} />
        </div>
        <div className="mb-3">
          <button type="button" className="btn btn-info" onClick={() => setShowScanner(!showScanner)}>
            <FontAwesomeIcon icon={faCamera} /> {showScanner ? "Cerrar Escáner" : "Escanear ISBN"}
          </button>
        </div>
        {showScanner && (
          <div className="mb-3">
            <div id="reader" style={{ width: "100%" }}></div>
          </div>
        )}
        <div className="mb-3">
          <input type="text" name="title" className="form-control" placeholder="Título" value={newBook.title} onChange={handleInputChange} required />
        </div>
        <div className="mb-3">
          <input type="text" name="author" className="form-control" placeholder="Autor" value={newBook.author} onChange={handleInputChange} required />
        </div>
        <div className="mb-3">
          <input type="text" name="genre" className="form-control" placeholder="Género" value={newBook.genre} onChange={handleInputChange} />
        </div>
        <div className="mb-3">
          <textarea name="description" className="form-control" placeholder="Descripción" value={newBook.description} onChange={handleInputChange}></textarea>
        </div>
        <div className="mb-3">
          <label htmlFor="status" className="form-label">Estado</label>
          <select name="status" id="status" className="form-control" value={newBook.status} onChange={handleInputChange}>
            <option value="Disponible">Disponible</option>
            <option value="De Viaje">De Viaje</option>
          </select>
        </div>
        <div className="mb-3">
          <input type="file" className="form-control" onChange={handleImageChange} />
        </div>
        <button type="submit" className="btn btn-primary">{editingBookId ? <><FontAwesomeIcon icon={faSave} /> Actualizar Libro</> : <><FontAwesomeIcon icon={faPlus} /> Añadir Libro</>}</button>
        {editingBookId && (
          <button type="button" className="btn btn-secondary ms-2" onClick={() => {
            setEditingBookId(null);
            setNewBook({
              title: '',
              author: '',
              isbn: '',
              genre: '',
              description: '',
              status: 'disponible',
              imageUrl: '',
            });
            setImageFile(null);
          }}><FontAwesomeIcon icon={faTimes} /> Cancelar Edición</button>
        )}
      </form>

      <h2 className="mb-3">Libros Disponibles</h2>
      <div className="mb-3">
        <input
          type="text"
          className="form-control"
          placeholder="Buscar por título o autor..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>
      <div className="row">
        {filteredBooks.map((book) => (
          <div key={book.id} className="col-md-4 mb-4">
            <div className="card h-100">
              {book.imageUrl && <img src={book.imageUrl} className="card-img-top" alt={book.title} style={{ height: '200px', objectFit: 'cover' }} />}
              <div className="card-body">
                <h5 className="card-title">{book.title}</h5>
                <h6 className="card-subtitle mb-2 text-muted">Autor: {book.author}</h6>
                <p className="card-text">Estado: {book.status}</p>
                <p className="card-text">Visitas: {book.views || 0}</p>
                <p className="card-text"><strong>ID Web:</strong> <button className="btn btn-info btn-sm" onClick={() => history.push(`/${book.webId}`)}><FontAwesomeIcon icon={faExternalLinkAlt} /> {book.webId}</button></p>
                
                {auth.currentUser && auth.currentUser.uid === book.ownerId ? (
                  <div className="d-flex justify-content-between mt-3">
                    <button className="btn btn-warning btn-sm" onClick={() => handleEditClick(book)}><FontAwesomeIcon icon={faEdit} /> Editar</button>
                    <button className="btn btn-danger btn-sm" onClick={() => handleDeleteClick(book.id, book.imageUrl)}><FontAwesomeIcon icon={faTrashAlt} /> Eliminar</button>
                    <button className="btn btn-info btn-sm" onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(`${window.location.origin}/${book.webId}`);
                        alert("¡Enlace copiado al portapapeles!");
                      } catch (err) {
                        console.error("Error al copiar el enlace: ", err);
                        alert("No se pudo copiar el enlace. Por favor, inténtalo manualmente.");
                      }
                    }}><FontAwesomeIcon icon={faShareAlt} /> Compartir</button>
                  </div>
                ) : (
                  auth.currentUser && (
                    <div className="mt-3">
                      
                      
                    </div>
                  )
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default BookList;