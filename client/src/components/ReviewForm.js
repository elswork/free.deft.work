import React, { useState } from 'react';
import { getFirestore, collection, addDoc } from 'firebase/firestore';
import { initializeApp } from 'firebase/app';
import firebaseConfig from '../firebaseConfig';

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

function ReviewForm({ bookId, userId, onReviewSubmitted }) {
  const [rating, setRating] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const [hover, setHover] = useState(0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (rating === 0 || reviewText.trim() === '') {
      alert("Por favor, proporciona una calificación y una reseña.");
      return;
    }

    try {
      await addDoc(collection(db, "reviews"), {
        bookId: bookId,
        userId: userId,
        rating: rating,
        reviewText: reviewText,
        timestamp: new Date(),
      });
      setRating(0);
      setReviewText('');
      alert("¡Reseña enviada con éxito!");
      if (onReviewSubmitted) {
        onReviewSubmitted();
      }
    } catch (error) {
      console.error("Error adding review: ", error);
      alert("Error al enviar la reseña.");
    }
  };

  return (
    <div className="card mt-4 p-4 shadow-sm">
      <h3 className="card-title text-center mb-4">Dejar una Reseña</h3>
      <form onSubmit={handleSubmit}>
        <div className="mb-3 text-center">
          {[...Array(5)].map((star, index) => {
            index += 1;
            return (
              <button
                type="button"
                key={index}
                className={index <= (hover || rating) ? "btn btn-warning btn-sm" : "btn btn-outline-warning btn-sm"}
                onClick={() => setRating(index)}
                onMouseEnter={() => setHover(index)}
                onMouseLeave={() => setHover(rating)}
                style={{ border: 'none', background: 'none', cursor: 'pointer' }}
              >
                <span className="star" style={{ fontSize: '1.5em' }}>&#9733;</span>
              </button>
            );
          })}
        </div>
        <div className="mb-3">
          <textarea
            className="form-control"
            placeholder="Escribe tu reseña aquí..."
            value={reviewText}
            onChange={(e) => setReviewText(e.target.value)}
            rows="4"
            required
          ></textarea>
        </div>
        <button type="submit" className="btn btn-primary w-100">Enviar Reseña</button>
      </form>
    </div>
  );
}

export default ReviewForm;