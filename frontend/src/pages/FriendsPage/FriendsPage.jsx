import { useEffect, useMemo, useRef, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { friendshipService } from '../../services/FriendshipService';
import useAuth from '../../hooks/useAuth';
import { colorForUser } from '../../utils/useColor';
import { pluralize } from '../../utils/pluralize';
import { swalConfirmDelete, toastSuccess, toastError } from '../../utils/swal';
import styles from './FriendsPage.module.scss';

const MIN_SEARCH_LENGTH = 3;
const SEARCH_DEBOUNCE_MS = 400;
const MAX_RESULTS = 8;
const SKELETON_ROWS = 3;
const FRIEND_REQUESTS_EVENT = 'tripdrop:friend-requests-changed';

const FRIEND_FORMS = { one: 'znajomy', few: 'znajomych', many: 'znajomych', other: 'znajomego' };
const REQUEST_FORMS = {
  one: 'zaproszenie czeka',
  few: 'zaproszenia czekają',
  many: 'zaproszeń czeka',
  other: 'zaproszenia czeka',
};

const normalizeTerm = (value) => value.trim().replace(/^@+/, '');
const initialOf = (username) => (username || '?').trim().charAt(0).toUpperCase() || '?';
const notifyFriendRequestsChanged = () => window.dispatchEvent(new Event(FRIEND_REQUESTS_EVENT));

const Avatar = ({ userId, username, small = false }) => (
  <span
    className={`${styles.avatar} ${small ? styles.avatarSmall : ''}`}
    style={{ background: colorForUser(userId) }}
    aria-hidden="true">
    {initialOf(username)}
  </span>
);

const FriendsPage = () => {
  const { user } = useAuth();

  const [version, setVersion] = useState(0);
  const [data, setData] = useState({ version: null, pending: [], friends: [], error: null });

  const [query, setQuery] = useState('');
  const [search, setSearch] = useState({ status: 'idle', results: [], error: null });
  const [sentIds, setSentIds] = useState(() => new Set());
  const [busyKeys, setBusyKeys] = useState(() => new Set());

  const timerRef = useRef(null);
  const searchIdRef = useRef(0);

  useEffect(() => {
    let cancelled = false;

    Promise.all([friendshipService.getPending(), friendshipService.getFriends()])
      .then(([pending, friends]) => {
        if (!cancelled) setData({ version, pending, friends, error: null });
      })
      .catch((err) => {
        if (!cancelled) setData((prev) => ({ ...prev, version, error: err.message }));
      });

    return () => {
      cancelled = true;
    };
  }, [version]);

  useEffect(() => {
    const reload = () => setVersion((v) => v + 1);
    window.addEventListener(FRIEND_REQUESTS_EVENT, reload);
    return () => window.removeEventListener(FRIEND_REQUESTS_EVENT, reload);
  }, []);

  useEffect(
    () => () => {
      clearTimeout(timerRef.current);
      searchIdRef.current += 1;
    },
    [],
  );

  const { pending, friends } = data;
  const isLoaded = data.version !== null;

  const friendIds = useMemo(() => new Set(friends.map((f) => f.id)), [friends]);
  const incomingByUserId = useMemo(
    () => new Map(pending.filter((p) => p.requester?.id).map((p) => [p.requester.id, p])),
    [pending],
  );

  const summary = useMemo(
    () => ({
      friends: pluralize(friends.length, FRIEND_FORMS),
      requests:
        pending.length === 0 ? 'brak nowych zaproszeń' : `${pluralize(pending.length, REQUEST_FORMS)} na odpowiedź`,
    }),
    [friends.length, pending.length],
  );

  const runBusy = async (key, action) => {
    if (busyKeys.has(key)) return;
    setBusyKeys((prev) => new Set(prev).add(key));
    try {
      await action();
    } finally {
      setBusyKeys((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }
  };

  const handleAccept = (request) =>
    runBusy(request.id, async () => {
      try {
        await friendshipService.accept(request.id);
        notifyFriendRequestsChanged();
        toastSuccess(`@${request.requester.username} jest teraz w Twoich znajomych.`);
      } catch (err) {
        toastError(err.message);
      }
    });

  const handleReject = async (request) => {
    const result = await swalConfirmDelete(
      'Odrzucić zaproszenie?',
      `@${request.requester.username} nie dostanie powiadomienia.`,
    );
    if (!result.isConfirmed) return;

    await runBusy(request.id, async () => {
      try {
        await friendshipService.reject(request.id);
        notifyFriendRequestsChanged();
        toastSuccess('Zaproszenie odrzucone.');
      } catch (err) {
        toastError(err.message);
      }
    });
  };

  const handleInvite = (candidate) =>
    runBusy(candidate.id, async () => {
      try {
        await friendshipService.sendInvite(candidate.id);
        setSentIds((prev) => new Set(prev).add(candidate.id));
        toastSuccess(`Zaproszenie do @${candidate.username} wysłane.`);
      } catch (err) {
        toastError(err.message);
      }
    });

  const handleQueryChange = (e) => {
    const value = e.target.value;
    setQuery(value);
    clearTimeout(timerRef.current);
    searchIdRef.current += 1;

    const term = normalizeTerm(value);
    if (term.length < MIN_SEARCH_LENGTH) {
      setSearch({ status: term.length === 0 ? 'idle' : 'tooShort', results: [], error: null });
      return;
    }

    setSearch((prev) => ({ ...prev, status: 'loading', error: null }));
    const searchId = searchIdRef.current;

    timerRef.current = setTimeout(async () => {
      try {
        const results = await friendshipService.searchUsers(term);
        if (searchId !== searchIdRef.current) return;
        setSearch({ status: 'done', results: results.slice(0, MAX_RESULTS), error: null });
      } catch (err) {
        if (searchId !== searchIdRef.current) return;
        setSearch({ status: 'error', results: [], error: err.message });
      }
    }, SEARCH_DEBOUNCE_MS);
  };

  const relationOf = (candidate) => {
    if (candidate.id === user?.id) return 'self';
    if (friendIds.has(candidate.id)) return 'friend';
    if (incomingByUserId.has(candidate.id)) return 'incoming';
    if (sentIds.has(candidate.id)) return 'sent';
    return 'none';
  };

  const searchHint = (() => {
    switch (search.status) {
      case 'tooShort':
        return `Wpisz co najmniej ${MIN_SEARCH_LENGTH} znaki.`;
      case 'loading':
        return search.results.length === 0 ? 'Szukam...' : '';
      case 'done':
        return search.results.length === 0 ? 'Nikt nie ma takiej nazwy. Sprawdź pisownię.' : '';
      case 'error':
        return search.error;
      default:
        return user?.username ? `Znajomi znajdą Cię po nazwie @${user.username}.` : '';
    }
  })();

  const renderRelationAction = (candidate) => {
    const relation = relationOf(candidate);
    const busy = busyKeys.has(candidate.id);

    switch (relation) {
      case 'self':
        return <span className={styles.relationNote}>To Ty</span>;
      case 'friend':
        return (
          <span className={`${styles.relationNote} ${styles.relationOk}`}>
            <FontAwesomeIcon icon="check" aria-hidden="true" />
            Znajomi
          </span>
        );
      case 'sent':
        return (
          <span className={styles.relationNote}>
            <FontAwesomeIcon icon="check" aria-hidden="true" />
            Wysłano
          </span>
        );
      case 'incoming': {
        const request = incomingByUserId.get(candidate.id);
        const requestBusy = busyKeys.has(request.id);
        return (
          <button
            type="button"
            className={styles.outlineBtn}
            onClick={() => handleAccept(request)}
            disabled={requestBusy}
            aria-label={`Akceptuj zaproszenie od @${candidate.username}`}>
            {requestBusy ? 'Akceptuję...' : 'Akceptuj'}
          </button>
        );
      }
      default:
        return (
          <button
            type="button"
            className={styles.inviteBtn}
            onClick={() => handleInvite(candidate)}
            disabled={busy}
            aria-label={`Zaproś @${candidate.username} do znajomych`}>
            <FontAwesomeIcon icon="user-plus" aria-hidden="true" />
            {busy ? 'Wysyłam...' : 'Zaproś'}
          </button>
        );
    }
  };

  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <svg className={styles.contours} viewBox="0 0 1440 240" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
          <path d="M1040 120c0-60 54-104 120-102s112 46 108 108-56 98-122 96-106-36-106-102z" />
          <path d="M990 124c2-90 80-156 178-150s166 72 158 164-84 148-182 142-156-52-154-156z" />
          <path d="M940 128c4-118 106-206 236-198s220 96 208 218-112 196-240 188-208-68-204-208z" />
          <path d="M890 132c6-146 132-256 292-246s274 120 260 272-140 244-298 234-260-84-254-260z" />
        </svg>
        <div className={styles.heroInner}>
          <h1 className={styles.title}>
            Twoi <em>znajomi</em>
          </h1>
          <p className={styles.summary} aria-live="polite">
            {isLoaded && (
              <>
                <span>{summary.friends}</span>
                <span>{summary.requests}</span>
              </>
            )}
          </p>
        </div>
      </section>

      <div className={styles.layout}>
        <div className={styles.main}>
          {pending.length > 0 && (
            <section className={styles.section} aria-labelledby="incoming-title">
              <h2 id="incoming-title" className={styles.sectionLabel}>
                Czekają na Twoją odpowiedź
              </h2>
              <div className={styles.requests}>
                {pending.map((request) => {
                  const busy = busyKeys.has(request.id);
                  const username = request.requester?.username ?? 'nieznany';
                  return (
                    <article key={request.id} className={styles.requestCard}>
                      <div className={styles.person}>
                        <Avatar userId={request.requester?.id} username={username} />
                        <div className={styles.personText}>
                          <span className={styles.personName}>@{username}</span>
                          <span className={styles.personMeta}>chce dołączyć do Twoich znajomych</span>
                        </div>
                      </div>
                      <div className={styles.requestActions}>
                        <button
                          type="button"
                          className={styles.acceptBtn}
                          onClick={() => handleAccept(request)}
                          disabled={busy}
                          aria-label={`Akceptuj zaproszenie od @${username}`}>
                          {busy ? 'Chwila...' : 'Akceptuj'}
                        </button>
                        <button
                          type="button"
                          className={styles.ghostBtn}
                          onClick={() => handleReject(request)}
                          disabled={busy}
                          aria-label={`Odrzuć zaproszenie od @${username}`}>
                          Odrzuć
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          )}

          <section className={styles.section} aria-labelledby="friends-title">
            <div className={styles.sectionHead}>
              <h2 id="friends-title" className={styles.sectionTitle}>
                Wszyscy znajomi
              </h2>
              {isLoaded && <span className={styles.count}>{friends.length}</span>}
            </div>

            {data.error && (
              <div className={styles.errorBox} role="alert">
                <span>{data.error}</span>
                <button type="button" className={styles.ghostBtn} onClick={() => setVersion((v) => v + 1)}>
                  Spróbuj ponownie
                </button>
              </div>
            )}

            {!isLoaded && (
              <ul className={styles.friendList} aria-hidden="true">
                {Array.from({ length: SKELETON_ROWS }, (_, i) => (
                  <li key={i} className={styles.friendRow}>
                    <span className={`${styles.skeleton} ${styles.skeletonAvatar}`} />
                    <span className={`${styles.skeleton} ${styles.skeletonLine}`} />
                  </li>
                ))}
              </ul>
            )}

            {isLoaded && !data.error && friends.length === 0 && (
              <p className={styles.empty}>
                Nikogo tu jeszcze nie ma. Wyszukaj kogoś po nazwie użytkownika i wyślij zaproszenie.
              </p>
            )}

            {isLoaded && friends.length > 0 && (
              <ul className={styles.friendList}>
                {friends.map((friend) => (
                  <li key={friend.id} className={styles.friendRow}>
                    <Avatar userId={friend.id} username={friend.username} />
                    <span className={styles.personName}>@{friend.username}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <aside className={styles.aside} aria-labelledby="add-title">
          <section className={styles.searchCard}>
            <h2 id="add-title" className={styles.asideTitle}>
              Dodaj znajomego
            </h2>

            <div className={styles.field}>
              <label htmlFor="friend-search" className={styles.label}>
                Nazwa użytkownika
              </label>
              <div className={styles.searchField}>
                <span className={styles.at} aria-hidden="true">
                  @
                </span>
                <input
                  id="friend-search"
                  type="search"
                  autoComplete="off"
                  spellCheck={false}
                  value={query}
                  onChange={handleQueryChange}
                  aria-describedby="friend-search-hint"
                  className={styles.searchInput}
                />
              </div>
              <p
                id="friend-search-hint"
                className={`${styles.hint} ${search.status === 'error' ? styles.hintError : ''}`}
                aria-live="polite">
                {searchHint}
              </p>
            </div>

            {search.results.length > 0 && (
              <ul className={`${styles.results} ${search.status === 'loading' ? styles.resultsStale : ''}`}>
                {search.results.map((candidate) => (
                  <li key={candidate.id} className={styles.resultRow}>
                    <Avatar userId={candidate.id} username={candidate.username} small />
                    <span className={styles.resultName}>@{candidate.username}</span>
                    {renderRelationAction(candidate)}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
};

export default FriendsPage;
