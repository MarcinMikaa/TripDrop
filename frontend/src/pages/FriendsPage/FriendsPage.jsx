import { useState, useEffect, useCallback, useRef } from 'react';
import { friendshipService } from '../../services/FriendshipService';
import styles from './FriendsPage.module.scss';

const FriendsPage = () => {
  const [activeTab, setActiveTab] = useState('pending');
  const [pending, setPending] = useState([]);
  const [friends, setFriends] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const debounceRef = useRef(null);

  const fetchPending = async () => {
    setIsLoading(true);
    setError('');
    try {
      const data = await friendshipService.getPending();
      setPending(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchFriends = async () => {
    setIsLoading(true);
    setError('');
    try {
      const data = await friendshipService.getFriends();
      setFriends(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'pending') fetchPending();
    if (activeTab === 'friends') fetchFriends();
  }, [activeTab]);

  const handleSearch = useCallback((e) => {
    const value = e.target.value;
    setSearchTerm(value);
    setSearchResults([]);

    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (value.trim().length < 3) return;

    debounceRef.current = setTimeout(async () => {
      setIsLoading(true);
      setError('');
      try {
        const data = await friendshipService.searchUsers(value.trim());
        setSearchResults(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    }, 400);
  }, []);

  const handleAccept = async (friendshipId) => {
    try {
      await friendshipService.accept(friendshipId);
      setPending((prev) => prev.filter((f) => f.id !== friendshipId));
    } catch (err) {
      setError(err.message);
    }
  };

  const handleReject = async (friendshipId) => {
    try {
      await friendshipService.reject(friendshipId);
      setPending((prev) => prev.filter((f) => f.id !== friendshipId));
    } catch (err) {
      setError(err.message);
    }
  };

  const handleSendInvite = async (addresseeId) => {
    try {
      await friendshipService.sendInvite(addresseeId);
      setSearchResults((prev) => prev.filter((u) => u.id !== addresseeId));
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className={styles.wrapper}>
      <h2>Znajomi</h2>

      {error && <p style={{ color: 'var(--accent-dark)', marginBottom: '1rem' }}>{error}</p>}

      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${activeTab === 'pending' ? styles.active : ''}`}
          onClick={() => setActiveTab('pending')}>
          Zaproszenia ({pending.length})
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'friends' ? styles.active : ''}`}
          onClick={() => setActiveTab('friends')}>
          Moi znajomi
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'search' ? styles.active : ''}`}
          onClick={() => setActiveTab('search')}>
          Wyszukaj
        </button>
      </div>

      <div className={styles.panel}>
        {isLoading && <p className={styles.empty}>Ładowanie...</p>}

        {!isLoading && activeTab === 'pending' && (
          <>
            {pending.length === 0 && <p className={styles.empty}>Brak oczekujących zaproszeń.</p>}
            {pending.map((f) => (
              <div key={f.id} className={styles.row}>
                <div className={styles.avatar}>{f.requester.username[0].toUpperCase()}</div>
                <div className={styles.rowInfo}>
                  <span className={styles.username}>{f.requester.username}</span>
                  <span className={styles.sub}>chce dodać Cię do znajomych</span>
                </div>
                <button className={`${styles.pillBtn} ${styles.accept}`} onClick={() => handleAccept(f.id)}>
                  Akceptuj
                </button>
                <button className={`${styles.pillBtn} ${styles.reject}`} onClick={() => handleReject(f.id)}>
                  Odrzuć
                </button>
              </div>
            ))}
          </>
        )}

        {!isLoading && activeTab === 'friends' && (
          <>
            {friends.length === 0 && <p className={styles.empty}>Nie masz jeszcze znajomych.</p>}
            {friends.map((f) => (
              <div key={f.id} className={styles.row}>
                <div className={styles.avatar}>{f.username[0].toUpperCase()}</div>
                <div className={styles.rowInfo}>
                  <span className={styles.username}>{f.username}</span>
                </div>
              </div>
            ))}
          </>
        )}

        {activeTab === 'search' && (
          <>
            <div className={styles.searchBox}>
              <input type="text" placeholder="Min. 3 znaki..." value={searchTerm} onChange={handleSearch} />
            </div>
            {!isLoading && searchTerm.trim().length >= 3 && searchResults.length === 0 && (
              <p className={styles.empty}>Nie znaleziono użytkowników.</p>
            )}
            {searchTerm.trim().length < 3 && searchTerm.trim().length > 0 && (
              <p className={styles.empty}>Wpisz minimum 3 znaki.</p>
            )}
            {!isLoading &&
              searchResults.map((u) => (
                <div key={u.id} className={styles.row}>
                  <div className={styles.avatar}>{u.username[0].toUpperCase()}</div>
                  <div className={styles.rowInfo}>
                    <span className={styles.username}>{u.username}</span>
                  </div>
                  <button className={styles.pillBtn} onClick={() => handleSendInvite(u.id)}>
                    Wyślij zaproszenie
                  </button>
                </div>
              ))}
          </>
        )}
      </div>
    </div>
  );
};

export default FriendsPage;
