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
          // Sort notifications by timestamp, newest first
          const sortedNotifications = userNotifications.sort((a, b) => b.timestamp.toMillis() - a.timestamp.toMillis());
          setNotifications(sortedNotifications);
          const unread = userNotifications.filter(n => !n.read).length;
          setUnreadNotifications(unread);
        }
      });
      return () => unsubscribe();
    }
  }, [auth.currentUser, db, setUnreadNotifications]);

  const handleMarkAsRead = async (notificationToMark) => {
    if (auth.currentUser && !notificationToMark.read) {
      const userRef = doc(db, "users", auth.currentUser.uid);
      const updatedNotifications = notifications.map(n =>
        n.timestamp.toMillis() === notificationToMark.timestamp.toMillis() ? { ...n, read: true } : n
      );
      await updateDoc(userRef, { notifications: updatedNotifications });
    }
  };

  const renderNotification = (notification) => {
    const commonProps = {
      style: {
        opacity: notification.read ? 0.6 : 1,
        textDecoration: 'none',
        color: 'inherit'
      },
      onClick: () => handleMarkAsRead(notification)
    };

    if (notification.type === 'follow') {
      return (
        <Link to={`/profile/${notification.followerId}`} {...commonProps}>
          <strong>{notification.followerName}</strong> ha comenzado a seguirte.
        </Link>
      );
    }
    
    // Default to comment notification
    return (
      <Link to={`/${notification.bookWebId}`} {...commonProps}>
        <strong>{notification.commenterName}</strong> comentó en tu libro <strong>{notification.bookTitle}</strong>.
      </Link>
    );
  };

  return (
    <div className="dropdown-menu dropdown-menu-end" aria-labelledby="notificationsDropdown">
      <h6 className="dropdown-header">Notificaciones</h6>
      {notifications.length === 0 ? (
        <span className="dropdown-item-text">No tienes notificaciones.</span>
      ) : (
        notifications.map((notification, index) => (
          <div key={index} className="dropdown-item">
            {renderNotification(notification)}
          </div>
        ))
      )}
    </div>
  );
}

export default Notifications;