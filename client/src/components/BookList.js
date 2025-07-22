import React, { useState, useEffect } from 'react';
import { getFirestore, collection, addDoc, onSnapshot, query, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { initializeApp } from 'firebase/app';
import firebaseConfig from '../firebaseConfig';
import { getAuth } from 'firebase/auth';

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);
const auth = getAuth(app);

function BookList() {
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

  useEffect(() => {
    const q = query(collection(db, "books"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const booksData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setBooks(booksData);
    });
    return () => unsubscribe();
  }, []);

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
        // Update existing book
        const bookRef = doc(db, "books", editingBookId);
        await updateDoc(bookRef, { ...newBook, imageUrl });
        setEditingBookId(null);
      } else {
        // Add new book
        await addDoc(collection(db, "books"), { ...newBook, imageUrl, ownerId: auth.currentUser.uid });
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
    if (window.confirm("Are you sure you want to delete this book?")) {
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

  return (
    <div className="mt-4">
      <h2 className="mb-3">{editingBookId ? "Edit Book" : "Add New Book"}</h2>
      <form onSubmit={handleAddOrUpdateBook} className="mb-5">
        <div className="mb-3">
          <input type="text" name="title" className="form-control" placeholder="Title" value={newBook.title} onChange={handleInputChange} required />
        </div>
        <div className="mb-3">
          <input type="text" name="author" className="form-control" placeholder="Author" value={newBook.author} onChange={handleInputChange} required />
        </div>
        <div className="mb-3">
          <input type="text" name="isbn" className="form-control" placeholder="ISBN" value={newBook.isbn} onChange={handleInputChange} />
        </div>
        <div className="mb-3">
          <input type="text" name="genre" className="form-control" placeholder="Genre" value={newBook.genre} onChange={handleInputChange} />
        </div>
        <div className="mb-3">
          <textarea name="description" className="form-control" placeholder="Description" value={newBook.description} onChange={handleInputChange}></textarea>
        </div>
        <div className="mb-3">
          <input type="file" className="form-control" onChange={handleImageChange} />
        </div>
        <button type="submit" className="btn btn-primary">{editingBookId ? "Update Book" : "Add Book"}</button>
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
          }}>Cancel Edit</button>
        )}
      </form>

      <h2 className="mb-3">Available Books</h2>
      <div className="row">
        {books.map((book) => (
          <div key={book.id} className="col-md-4 mb-4">
            <div className="card h-100">
              {book.imageUrl && <img src={book.imageUrl} className="card-img-top" alt={book.title} style={{ height: '200px', objectFit: 'cover' }} />}
              <div className="card-body">
                <h5 className="card-title">{book.title}</h5>
                <h6 className="card-subtitle mb-2 text-muted">{book.author}</h6>
                <p className="card-text">Status: {book.status}</p>
                {auth.currentUser && auth.currentUser.uid === book.ownerId && (
                  <div className="d-flex justify-content-between">
                    <button className="btn btn-warning btn-sm" onClick={() => handleEditClick(book)}>Edit</button>
                    <button className="btn btn-danger btn-sm" onClick={() => handleDeleteClick(book.id, book.imageUrl)}>Delete</button>
                  </div>
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