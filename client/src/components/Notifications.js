import React, { useState, useEffect } from 'react';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { Link } from 'react-router-dom';

function Notifications({ auth, db, setUnreadNotifications }) {
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    if (auth.currentUser) {
      const userRef = doc(db, "users", auth.currentUser.uid);
      const unsubscribe = onSnapshot(userRef, (docSnap) => {
        if (docSnap.exists()) {
          const userNotifications = docSnap.data().notifications || [];
          setNotifications(userNotifications);
          const unread = userNotifications.filter(n => !n.read).length;
          setUnreadNotifications(unread);
        }
      });
      return () => unsubscribe();
    }
  }, [auth.currentUser, db, setUnreadNotifications]);

  const handleMarkAsRead = async (notificationToMark) => {
    if (auth.currentUser) {
      const userRef = doc(db, "users", auth.currentUser.uid);
      const updatedNotifications = notifications.map(n => 
        n.timestamp.toDate().getTime() === notificationToMark.timestamp.toDate().getTime() ? { ...n, read: true } : n
      );
      await updateDoc(userRef, { notifications: updatedNotifications });
    }
  };

  return (
    <div className="dropdown-menu dropdown-menu-end" aria-labelledby="notificationsDropdown">
      <h6 className="dropdown-header">Notificaciones</h6>
      {notifications.length === 0 ? (
        <span className="dropdown-item-text">No tienes notificaciones nuevas.</span>
      ) : (
        notifications.map((notification, index) => (
          <div key={index} className="dropdown-item">
            {!notification.read && (
              <Link to={`/${notification.bookWebId}`} onClick={() => handleMarkAsRead(notification)}>
                <strong>{notification.commenterName}</strong> comentó en tu libro <strong>{notification.bookTitle}</strong>.
              </Link>
            )}
          </div>
        ))
      )}
    </div>
  );
}

export default Notifications;
