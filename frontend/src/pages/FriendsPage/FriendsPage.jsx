import { useState, useEffect, useCallback, useRef } from 'react';
import { friendshipService } from '../../services/FriendshipService';
import { swalError, toastSuccess, swalConfirmDelete } from '../../utils/swal';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import styles from './FriendsPage.module.scss';

const AVATAR_COLORS = ['steel', 'amber'];

const FriendsPage = () => {
  const [activeTab, setActiveTab] = useState('pending');
  const [pending, setPending] = useState([]);
  const [friends, setFriends] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [sentInvites, setSentInvites] = useState(new Set());
  const [isLoading, setIsLoading] = useState(false);

  const debounceRef = useRef(null);

  const fetchPending = async () => {
    setIsLoading(true);
    try {
      const data = await friendshipService.getPending();
      setPending(data);
    } catch (err) {
      swalError('Błąd', err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchFriends = async () => {
    setIsLoading(true);
    try {
      const data = await friendshipService.getFriends();
      setFriends(data);
    } catch (err) {
      swalError('Błąd', err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPending();
    fetchFriends();
  }, []);

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
      try {
        const data = await friendshipService.searchUsers(value.trim());
        setSearchResults(data);
      } catch (err) {
        swalError('Błąd', err.message);
      } finally {
        setIsLoading(false);
      }
    }, 400);
  }, []);

  const handleAccept = async (friendshipId) => {
    try {
      await friendshipService.accept(friendshipId);
      setPending(prev => prev.filter(f => f.id !== friendshipId));
      await fetchFriends();
      setActiveTab('friends');
      toastSuccess('Zaproszenie zaakceptowane!');
    } catch (err) {
      swalError('Błąd', err.message);
    }
  };

  const handleReject = async (friendshipId) => {
    const result = await swalConfirmDelete(
      'Odrzucić zaproszenie?',
      'Użytkownik nie zostanie powiadomiony.'
    );
    if (!result.isConfirmed) return;

    try {
      await friendshipService.reject(friendshipId);
      setPending(prev => prev.filter(f => f.id !== friendshipId));
      toastSuccess('Zaproszenie odrzucone.');
    } catch (err) {
      swalError('Błąd', err.message);
    }
  };

  const handleSendInvite = async (addresseeId) => {
    try {
      await friendshipService.sendInvite(addresseeId);
      setSentInvites(prev => new Set([...prev, addresseeId]));
      toastSuccess('Zaproszenie wysłane!');
    } catch (err) {
      swalError('Błąd', err.message);
    }
  };

  const tabs = [
    { key: 'pending', icon: 'bell',              label: 'Zaproszenia' },
    { key: 'friends', icon: 'user-group',        label: 'Moi znajomi' },
    { key: 'search',  icon: 'magnifying-glass',  label: 'Wyszukaj' },
  ];

  return (
    <div className={styles.wrapper}>
      <div className={styles.header}>
        <h1>Znajomi</h1>
        <p>Zarządzaj znajomymi i zapraszaj ich do wspólnych podróży</p>
      </div>

      <div className={styles.stats}>
        <div className={styles.statCard}>
          <div className={`${styles.statIcon} ${styles.iconSteel}`}>
            <FontAwesomeIcon icon="user-group" />
          </div>
          <div>
            <div className={styles.statNum}>{friends.length}</div>
            <div className={styles.statLabel}>znajomych</div>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={`${styles.statIcon} ${styles.iconAmber}`}>
            <FontAwesomeIcon icon="bell" />
          </div>
          <div>
            <div className={styles.statNum}>{pending.length}</div>
            <div className={styles.statLabel}>oczekujące zaproszenia</div>
          </div>
        </div>
      </div>

      <div className={styles.tabsWrap}>
        {tabs.map(tab => (
          <button
            key={tab.key}
            className={`${styles.tab} ${activeTab === tab.key ? styles.active : ''}`}
            onClick={() => setActiveTab(tab.key)}
          >
            <FontAwesomeIcon icon={tab.icon} />
            {tab.label}
            {tab.key === 'pending' && pending.length > 0 && (
              <span className={styles.tabBadge}>{pending.length}</span>
            )}
          </button>
        ))}
      </div>

      <div className={styles.panel}>
        {isLoading && (
          <div className={styles.loadingState}>Ładowanie...</div>
        )}

        {!isLoading && activeTab === 'pending' && (
          pending.length === 0 ? (
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}>
                <FontAwesomeIcon icon="bell" />
              </div>
              <p className={styles.emptyTitle}>Brak oczekujących zaproszeń</p>
              <p className={styles.emptySub}>Gdy ktoś wyśle Ci zaproszenie, pojawi się tutaj.</p>
            </div>
          ) : (
            pending.map((f, i) => (
              <div key={f.id} className={styles.row}>
                <div className={`${styles.avatar} ${AVATAR_COLORS[i % 2] === 'steel' ? styles.avatarSteel : styles.avatarAmber}`}>
                  {f.requester.username[0].toUpperCase()}
                </div>
                <div className={styles.rowInfo}>
                  <span className={styles.username}>{f.requester.username}</span>
                  <span className={styles.sub}>chce dodać Cię do znajomych</span>
                </div>
                <button className={`${styles.pillBtn} ${styles.accept}`} onClick={() => handleAccept(f.id)}>
                  <FontAwesomeIcon icon="check" /> Akceptuj
                </button>
                <button className={`${styles.pillBtn} ${styles.reject}`} onClick={() => handleReject(f.id)}>
                  <FontAwesomeIcon icon="xmark" /> Odrzuć
                </button>
              </div>
            ))
          )
        )}

        {!isLoading && activeTab === 'friends' && (
          friends.length === 0 ? (
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}>
                <FontAwesomeIcon icon="user-group" />
              </div>
              <p className={styles.emptyTitle}>Nie masz jeszcze znajomych</p>
              <p className={styles.emptySub}>Wyszukaj użytkowników i wyślij pierwsze zaproszenie.</p>
            </div>
          ) : (
            friends.map((f, i) => (
              <div key={f.id} className={styles.row}>
                <div className={`${styles.avatar} ${AVATAR_COLORS[i % 2] === 'steel' ? styles.avatarSteel : styles.avatarAmber}`}>
                  {f.username[0].toUpperCase()}
                </div>
                <div className={styles.rowInfo}>
                  <span className={styles.username}>{f.username}</span>
                </div>
              </div>
            ))
          )
        )}

        {activeTab === 'search' && (
          <>
            <div className={styles.searchBox}>
              <FontAwesomeIcon icon="magnifying-glass" className={styles.searchIcon} />
              <input
                type="text"
                placeholder="Wpisz min. 3 znaki nazwy użytkownika..."
                value={searchTerm}
                onChange={handleSearch}
              />
            </div>

            {!isLoading && searchTerm.trim().length >= 3 && searchResults.length === 0 && (
              <div className={styles.emptyState}>
                <div className={styles.emptyIcon}>
                  <FontAwesomeIcon icon="magnifying-glass" />
                </div>
                <p className={styles.emptyTitle}>Nie znaleziono użytkowników</p>
                <p className={styles.emptySub}>Sprawdź czy nazwa jest poprawna.</p>
              </div>
            )}

            {searchTerm.trim().length > 0 && searchTerm.trim().length < 3 && (
              <div className={styles.emptyState}>
                <p className={styles.emptySub}>Wpisz minimum 3 znaki, aby rozpocząć wyszukiwanie.</p>
              </div>
            )}

            {!isLoading && searchResults.map((u, i) => (
              <div key={u.id} className={styles.row}>
                <div className={`${styles.avatar} ${AVATAR_COLORS[i % 2] === 'steel' ? styles.avatarSteel : styles.avatarAmber}`}>
                  {u.username[0].toUpperCase()}
                </div>
                <div className={styles.rowInfo}>
                  <span className={styles.username}>{u.username}</span>
                </div>
                {sentInvites.has(u.id) ? (
                  <span className={styles.sentBadge}>
                    <FontAwesomeIcon icon="check" /> Zaproszenie wysłane
                  </span>
                ) : (
                  <button className={styles.pillBtn} onClick={() => handleSendInvite(u.id)}>
                    <FontAwesomeIcon icon="user-plus" /> Wyślij zaproszenie
                  </button>
                )}
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
};

export default FriendsPage;
