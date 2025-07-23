import React, { useState, useEffect } from 'react';
import { collection, addDoc, onSnapshot, query, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import Chat from './Chat';
import ReviewForm from './ReviewForm'; // Import the ReviewForm component

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
  const [selectedBookForChat, setSelectedBookForChat] = useState(null);
  const [reviews, setReviews] = useState({}); // New state for reviews

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
    const unsubscribeReviews = onSnapshot(collection(db, "reviews"), (snapshot) => {
      const newReviews = {};
      snapshot.docs.forEach(doc => {
        const review = doc.data();
        if (!newReviews[review.bookId]) {
          newReviews[review.bookId] = [];
        }
        newReviews[review.bookId].push(review);
      });
      setReviews(newReviews);
    });
    return () => unsubscribeReviews();
  }, [db]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewBook({ ...newBook, [name]: value });
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
        await addDoc(collection(db, "books"), { ...newBook, imageUrl, ownerId: auth.currentUser.uid, webId });
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

  const handleChatClick = (book) => {
    setSelectedBookForChat(book);
  };

  const handleCloseChat = () => {
    setSelectedBookForChat(null);
  };

  if (selectedBookForChat) {
    return <Chat book={selectedBookForChat} onCloseChat={handleCloseChat} auth={auth} db={db} storage={storage} />;
  }

  return (
    <div className="mt-4">
      <h2 className="mb-3">{editingBookId ? "Editar Libro" : "Añadir Nuevo Libro"}</h2>
      <form onSubmit={handleAddOrUpdateBook} className="mb-5">
        <div className="mb-3">
          <input type="text" name="title" className="form-control" placeholder="Título" value={newBook.title} onChange={handleInputChange} required />
        </div>
        <div className="mb-3">
          <input type="text" name="author" className="form-control" placeholder="Autor" value={newBook.author} onChange={handleInputChange} required />
        </div>
        <div className="mb-3">
          <input type="text" name="isbn" className="form-control" placeholder="ISBN" value={newBook.isbn} onChange={handleInputChange} />
        </div>
        <div className="mb-3">
          <input type="text" name="genre" className="form-control" placeholder="Género" value={newBook.genre} onChange={handleInputChange} />
        </div>
        <div className="mb-3">
          <textarea name="description" className="form-control" placeholder="Descripción" value={newBook.description} onChange={handleInputChange}></textarea>
        </div>
        <div className="mb-3">
          <input type="file" className="form-control" onChange={handleImageChange} />
        </div>
        <button type="submit" className="btn btn-primary">{editingBookId ? "Actualizar Libro" : "Añadir Libro"}</button>
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
          }}>Cancelar Edición</button>
        )}
      </form>

      <h2 className="mb-3">Libros Disponibles</h2>
      <div className="row">
        {books.map((book) => (
          <div key={book.id} className="col-md-4 mb-4">
            <div className="card h-100">
              {book.imageUrl && <img src={book.imageUrl} className="card-img-top" alt={book.title} style={{ height: '200px', objectFit: 'cover' }} />}
              <div className="card-body">
                <h5 className="card-title">{book.title}</h5>
                <h6 className="card-subtitle mb-2 text-muted">Autor: {book.author}</h6>
                <p className="card-text">Estado: {book.status}</p>
                {reviews[book.id] && reviews[book.id].length > 0 && (
                  <div className="mt-3">
                    <h6>Reseñas:</h6>
                    {reviews[book.id].map((review, index) => (
                      <div key={index} className="mb-2 border-bottom pb-2">
                        <p className="mb-0">Calificación: {review.rating} / 5</p>
                        <p className="mb-0">"{review.reviewText}"</p>
                      </div>
                    ))}
                  </div>
                )}
                {auth.currentUser && auth.currentUser.uid === book.ownerId ? (
                  <div className="d-flex justify-content-between mt-3">
                    <button className="btn btn-warning btn-sm" onClick={() => handleEditClick(book)}>Editar</button>
                    <button className="btn btn-danger btn-sm" onClick={() => handleDeleteClick(book.id, book.imageUrl)}>Eliminar</button>
                  </div>
                ) : (
                  auth.currentUser && (
                    <div className="mt-3">
                      <button className="btn btn-info btn-sm me-2" onClick={() => handleChatClick(book)}>Chatear con Propietario</button>
                      <ReviewForm bookId={book.id} userId={auth.currentUser.uid} db={db} />
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