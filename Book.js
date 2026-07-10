document.addEventListener('DOMContentLoaded', () => {
    const gutendexUrl = 'https://gutendex.com/books/';
    let currentQuery = 'the great';
    let currentPage = 1;
    const resultsPerPage = 10;
    const searchInput = document.getElementById('search');
    const searchButton = document.getElementById('searchButton');
    const loadMoreButton = document.getElementById('loadMoreButton');
    const bookList = document.getElementById('bookList');
    const searchSuggestions = document.getElementById('searchSuggestions');
    const relatedBooksSection = document.getElementById('relatedBooksSection');
    const relatedBooksList = document.getElementById('relatedBooksList');
    const resultCount = document.getElementById('resultCount');

    let searchHistory = JSON.parse(localStorage.getItem('searchHistory')) || [];
    let allFetchedBooks = []; // Store all books for related search
    let suggestionTimeout;
    let selectedSuggestionIndex = -1;

    let modal = document.getElementById('bookModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'bookModal';
        modal.className = 'book-modal';
        modal.innerHTML = `
            <div class="book-modal__content">
                <button class="book-modal__close">&times;</button>
                <div class="book-modal__body"></div>
            </div>
        `;
        document.body.appendChild(modal);
        
        modal.querySelector('.book-modal__close').addEventListener('click', () => {
            modal.classList.remove('active');
        });
        
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.remove('active');
            }
        });
    }

    function showBookModal(book) {
        const author = book.authors?.[0]?.name || 'Unknown Author';
        const description = book.summaries?.[0] || 'No description available';
        const coverUrl = book.formats?.['image/jpeg'] || book.formats?.['image/png'] || book.formats?.['image/webp'] || '';
        const subjects = book.subjects?.join(', ') || 'No subjects';
        const languages = book.languages?.join(', ') || 'Unknown';
        const downloads = book.download_count || 0;

        const content = document.querySelector('.book-modal__body');
        content.innerHTML = `
            <div class="book-modal__header">
                <h2>${book.title}</h2>
            </div>
            ${coverUrl ? `<img src="${coverUrl}" alt="${book.title}" class="book-modal__cover">` : ''}
            <div class="book-modal__info">
                <p><strong>Author:</strong> ${author}</p>
                <p><strong>Languages:</strong> ${languages}</p>
                <p><strong>Downloads:</strong> ${downloads.toLocaleString()}</p>
                <p><strong>Subjects:</strong> ${subjects}</p>
            </div>
            <div class="book-modal__description">
                <h3>Description</h3>
                <p>${description}</p>
            </div>
        `;
        
        modal.classList.add('active');
    }

    function setLoadMore(hasNext) {
        loadMoreButton.disabled = !hasNext;
        loadMoreButton.style.display = 'block';
    }

    function showMessage(message) {
        bookList.innerHTML = `<li class="book-card no-results">${message}</li>`;
    }

    function updateSearchHistory(query) {
        if (!query) return;
        searchHistory = searchHistory.filter(q => q !== query);
        searchHistory.unshift(query);
        searchHistory = searchHistory.slice(0, 8);
        localStorage.setItem('searchHistory', JSON.stringify(searchHistory));
    }

    async function fetchSuggestions(query) {
        if (!query || query.length < 2) {
            hideSuggestions();
            return;
        }

        try {
            const params = new URLSearchParams({
                search: query,
                page: '1',
                page_size: '5'
            });
            const response = await fetch(`${gutendexUrl}?${params}`);
            const data = await response.json();
            
            const books = data.results || [];
            const bookTitles = books.slice(0, 3).map(b => b.title);
            const authors = books
                .filter(b => b.authors && b.authors.length > 0)
                .slice(0, 2)
                .map(b => b.authors[0].name);
            
            const searchHistory = JSON.parse(localStorage.getItem('searchHistory')) || [];
            const historyMatches = searchHistory
                .filter(h => h.toLowerCase().includes(query.toLowerCase()))
                .slice(0, 3);

            showSuggestions(bookTitles, authors, historyMatches);
        } catch (error) {
            console.error('Error fetching suggestions:', error);
            hideSuggestions();
        }
    }

    function showSuggestions(books, authors, history) {
        searchSuggestions.innerHTML = '';
        selectedSuggestionIndex = -1;

        if (history.length > 0) {
            const historyLabel = document.createElement('li');
            historyLabel.className = 'search-suggestion-category';
            historyLabel.textContent = 'Recent Searches';
            searchSuggestions.appendChild(historyLabel);

            history.forEach(item => {
                const li = document.createElement('li');
                li.className = 'search-suggestion-item';
                li.innerHTML = `<strong>🕐</strong> ${item}`;
                li.addEventListener('click', () => {
                    searchInput.value = item;
                    hideSuggestions();
                    startSearch();
                });
                searchSuggestions.appendChild(li);
            });
        }

        if (books.length > 0 || authors.length > 0) {
            if (books.length > 0) {
                const booksLabel = document.createElement('li');
                booksLabel.className = 'search-suggestion-category';
                booksLabel.textContent = 'Books';
                searchSuggestions.appendChild(booksLabel);

                books.forEach(book => {
                    const li = document.createElement('li');
                    li.className = 'search-suggestion-item';
                    li.innerHTML = `<strong>📖</strong> ${book}`;
                    li.addEventListener('click', () => {
                        searchInput.value = book;
                        hideSuggestions();
                        startSearch();
                    });
                    searchSuggestions.appendChild(li);
                });
            }

            if (authors.length > 0) {
                const authorsLabel = document.createElement('li');
                authorsLabel.className = 'search-suggestion-category';
                authorsLabel.textContent = 'Authors';
                searchSuggestions.appendChild(authorsLabel);

                authors.forEach(author => {
                    const li = document.createElement('li');
                    li.className = 'search-suggestion-item';
                    li.innerHTML = `<strong>✍️</strong> ${author}`;
                    li.addEventListener('click', () => {
                        searchInput.value = author;
                        hideSuggestions();
                        startSearch();
                    });
                    searchSuggestions.appendChild(li);
                });
            }
        }

        if (searchSuggestions.children.length > 0) {
            searchSuggestions.removeAttribute('hidden');
        }
    }

    function hideSuggestions() {
        searchSuggestions.setAttribute('hidden', '');
        selectedSuggestionIndex = -1;
    }

    async function fetchClassicBooks(authorOrTitle, page = 1) {
        try {
            const params = new URLSearchParams({
                search: authorOrTitle,
                page: String(page),
                page_size: String(resultsPerPage)
            });
            const fullUrl = `${gutendexUrl}?${params}`;
            const response = await fetch(fullUrl);
            if (!response.ok) throw new Error(`HTTP error: ${response.status}`);

            const data = await response.json();
            return {
                books: data.results || [],
                hasNext: Boolean(data.next),
                totalCount: data.count || 0
            };
        } catch (error) {
            console.error('Could not fetch classics:', error);
            return { books: [], hasNext: false, totalCount: 0, error };
        }
    }

    async function fetchRelatedBooks(book) {
        // Fetch books by the same author or with similar subjects
        try {
            const author = book.authors?.[0]?.name;
            let relatedBooks = [];

            if (author) {
                const params = new URLSearchParams({
                    search: author,
                    page: '1',
                    page_size: '6'
                });
                const response = await fetch(`${gutendexUrl}?${params}`);
                const data = await response.json();
                relatedBooks = (data.results || []).filter(b => b.id !== book.id);
            }

            return relatedBooks;
        } catch (error) {
            console.error('Error fetching related books:', error);
            return [];
        }
    }

    function createBookCard(book) {
        const title = book.title || 'Untitled';
        const author = book.authors?.[0]?.name || 'Unknown Author';
        const coverUrl = book.formats?.['image/jpeg'] || book.formats?.['image/png'] || book.formats?.['image/webp'] || '';
        const subjects = book.subjects?.slice(0, 2).join(', ') || 'Classic book';
        const description = book.summaries?.[0] || 'No description available';
        
        const scribdSearchUrl = `https://www.scribd.com/search?query=${encodeURIComponent(title)}`;

        const li = document.createElement('li');
        li.className = 'brutalist-card';
        li.innerHTML = `
            ${coverUrl ? `<img src="${coverUrl}" alt="${title} cover" class="brutalist-card__cover" loading="lazy">` : '<div class="brutalist-card__cover-placeholder">No cover</div>'}
            <div class="brutalist-card__header">
                <div class="brutalist-card__icon">
                    <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"></path>
                    </svg>
                </div>
                <div class="brutalist-card__alert">${title}</div>
            </div>
            <div class="brutalist-card__message">
                <strong>${author}</strong><br>${subjects}
                <div class="brutalist-card__description">${description}</div>
            </div>
            <div class="brutalist-card__actions">
                <button class="brutalist-card__button brutalist-card__button--mark">Inspect</button>
                <a class="brutalist-card__button brutalist-card__button--read" href="${scribdSearchUrl}" target="_blank" rel="noopener noreferrer">Read Online</a>
            </div>
        `;
        
        li.querySelector('.brutalist-card__button--mark').addEventListener('click', async () => {
            showBookModal(book);
            

            const relatedBooks = await fetchRelatedBooks(book);
            if (relatedBooks.length > 0) {
                displayRelatedBooks(relatedBooks);
            }
        });
        
        return li;
    }

    function displayRelatedBooks(books) {
        const validBooks = books.filter(book => {
            const hasAuthor = book.authors && book.authors.length > 0 && book.authors[0].name;
            return hasAuthor;
        }).slice(0, 6);

        if (validBooks.length === 0) {
            relatedBooksSection.style.display = 'none';
            return;
        }

        relatedBooksList.innerHTML = '';
        validBooks.forEach(book => {
            relatedBooksList.appendChild(createBookCard(book));
        });

        relatedBooksSection.style.display = 'block';
        relatedBooksSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    function renderBooks(books, append = false, hasNext = false, totalCount = 0) {
        if (!append) {
            bookList.innerHTML = '';
            relatedBooksSection.style.display = 'none';
        }

        const booksWithAuthors = books.filter(book => {
            const hasAuthor = book.authors && book.authors.length > 0 && book.authors[0].name;
            return hasAuthor;
        });

        if (!booksWithAuthors.length) {
            if (!append) {
                showMessage('No books found.');
                resultCount.style.display = 'none';
            }
            setLoadMore(hasNext);
            return;
        }

        booksWithAuthors.forEach(book => {
            bookList.appendChild(createBookCard(book));
        });


        if (!append && totalCount > 0) {
            resultCount.textContent = `Found ${totalCount} results`;
            resultCount.style.display = 'inline-block';
        }

        setLoadMore(hasNext);
    }

    async function loadBooks(query, page = 1) {
        searchButton.disabled = true;
        searchButton.textContent = page === 1 ? 'Searching...' : 'Loading...';
        const { books, hasNext, totalCount } = await fetchClassicBooks(query, page);
        renderBooks(books, page > 1, hasNext, totalCount);
        searchButton.disabled = false;
        searchButton.textContent = 'Search';
    }

    function startSearch() {
        const query = searchInput.value.trim();
        if (!query) {
            alert('Please enter a search term');
            return;
        }
        currentQuery = query;
        currentPage = 1;
        updateSearchHistory(query);
        hideSuggestions();
        loadBooks(currentQuery, currentPage);
    }

    // Event listeners
    searchButton.addEventListener('click', startSearch);
    
    searchInput.addEventListener('keydown', event => {
        if (event.key === 'Enter') {
            startSearch();
        } else if (event.key === 'ArrowDown') {
            event.preventDefault();
            const items = searchSuggestions.querySelectorAll('.search-suggestion-item');
            if (items.length > 0) {
                selectedSuggestionIndex = Math.min(selectedSuggestionIndex + 1, items.length - 1);
                updateSuggestionSelection(items);
            }
        } else if (event.key === 'ArrowUp') {
            event.preventDefault();
            const items = searchSuggestions.querySelectorAll('.search-suggestion-item');
            if (items.length > 0) {
                selectedSuggestionIndex = Math.max(selectedSuggestionIndex - 1, -1);
                updateSuggestionSelection(items);
            }
        } else if (event.key === 'Escape') {
            hideSuggestions();
        }
    });

    searchInput.addEventListener('input', (e) => {
        clearTimeout(suggestionTimeout);
        suggestionTimeout = setTimeout(() => {
            fetchSuggestions(e.target.value);
        }, 300); // Debounce for 300ms
    });

    searchInput.addEventListener('focus', () => {
        if (searchInput.value.length >= 2) {
            fetchSuggestions(searchInput.value);
        }
    });

    searchInput.addEventListener('blur', () => {
        // Delay hiding to allow clicking on suggestions
        setTimeout(() => {
            hideSuggestions();
        }, 200);
    });

    function updateSuggestionSelection(items) {
        items.forEach((item, index) => {
            if (index === selectedSuggestionIndex) {
                item.classList.add('selected');
                item.scrollIntoView({ block: 'nearest' });
            } else {
                item.classList.remove('selected');
            }
        });
    }

    loadMoreButton.addEventListener('click', async () => {
        currentPage += 1;
        await loadBooks(currentQuery, currentPage);
    });

    loadBooks(currentQuery, currentPage);
});

