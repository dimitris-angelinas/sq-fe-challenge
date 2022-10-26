import './App.css';
import ReactStars from "react-rating-stars-component";
import {useEffect, useState}  from 'react'
import { LazyLoadImage } from 'react-lazy-load-image-component';

function App() {

  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(false);

  const apiUrl = 'http://localhost:3000';
  const flagsUrl = 'https://restcountries.com/v3.1/alpha';

  useEffect(()=>{
    const getStores = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${apiUrl}/stores`);
        const json = await res.json();
        const stores = getStoresData(json);
        const countryCodesString = getCountryCodesString(stores);
        if (countryCodesString) {
          const res = await fetch(`${flagsUrl}?codes=${countryCodesString}`);
          const countries = await res.json();
          updateStoresFlags(stores, countries);
          setStores(stores);
          setLoading(false);
        }
      }
      catch (error) {
        setLoading(false);
        console.log(error)
      }
    };
    getStores()
  },[]);

  const updateRating = async (id, rating) => {
    try {
      const body = {
        data: {
          type: "stores",
          id,
          attributes: {
            rating
          }
        }
      };
      fetch(`${apiUrl}/stores/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
        headers: {"Content-Type": "application/vnd.api+json"}
      })
    }
    catch (error) {
      console.log(error)
    }
  };

  const compareBooks = (a,b) => {
    if(a.copiesSold > b.copiesSold) return -1;
    if(a.copiesSold > b.copiesSold) return 1;
    return 0;
  };

  const getStoresData = (json) => {
    let stores = [];

    // get store attributes
    json.data.forEach(item=>{
      let store = {
        id: item.id,
        ...item.attributes
      };
      store.countries = item.relationships.countries.data.id;
      store.books = [];
      const books = item.relationships?.books?.data || [];
      books.forEach(book=>{
        store.books.push(book.id)
      });
      stores.push(store)
    });

    let relationshipsMap = {
      countries: {},
      books: {},
      authors: {}
    };

    // get books and countries relations
    json.included.forEach(item=>{
      relationshipsMap[item.type][item.id] = {...item.attributes};
      if(item.type == 'books'){
        relationshipsMap[item.type][item.id].author = item.relationships.author.data.id
      }
    });

    // get author relations
    for(const [id, book] of Object.entries(relationshipsMap.books)){
      book.author = {
        id: book.author,
        ...relationshipsMap.authors[book.author]
      }
    }

    // build final stores array
    stores.forEach(item=>{
      item.countries = {
        id: item.countries,
        ...relationshipsMap.countries[item.countries]
      };
      let books = [];
      item.books.forEach(book=>{
        books.push({
          id: book,
          ...relationshipsMap.books[book]
        })
      });
      // sort books by copies sold
      item.books = books.sort(compareBooks)
    });

    return stores
  };

  const getCountryCodesString = (stores) => {
    let codes = {};
    stores.forEach(store=>{
      codes[store.countries.code] = store.countries.code
    });
    let str = '';
    for(const [code, value] of Object.entries(codes)){
      str += code + ','
    }
    if(str.endsWith(',')){
      str = str.substring(0, str.length - 1);
    }
    return str
  };

  const updateStoresFlags = (stores, countries) => {
    let flagMap = {};
    countries.forEach(item=>{
      flagMap[item.cca2] = item.flags.png
    });
    stores.forEach(item=>{
      item.countries.flag = flagMap[item.countries.code]
    })
  };

  const getDateFormat = (iso) => {
    let split = iso.split('+');
    split = split[0].split('T');
    const date = split[0];
    split = date.split('-');
    const year = split[0];
    const month = split[1];
    const day = split[2];
    return `${day}.${month}.${year}`;
  };

  const Store = ({store, visibleByDefault=false}) => {
    return (
        <div className={`store`}>
          <div className={`container store-top`}>
            <div className={`column store-image`} >
              <LazyLoadImage
                  alt={store.name}
                  src={store.storeImage}
                  visibleByDefault={visibleByDefault}
              />
            </div>
            <div className={`column store-main-info`}>
              <div className={`store-name-rating`}>
                <div className={`store-name`}>
                  <h2>{store.name}</h2>
                </div>
                <div className={`store-rating`}>
                  <ReactStars
                      edit={true}
                      count={5}
                      value={store.rating}
                      onChange={(rating)=>updateRating(store.id, rating)}
                      size={24}
                      activeColor="#ffd700"
                  />
                </div>
              </div>
              <div className={`store-best-sellers`}>
                <table>
                  <thead>
                  <tr>
                    <th colSpan={2}>Best-selling books</th>
                  </tr>
                  </thead>
                  <tbody>
                  {store.books.slice(0,2).map((book,i)=>{
                    return (
                        <tr key={i}>
                          <td>{book.name}</td>
                          <td>{book.author.fullName}</td>
                        </tr>
                    )
                  })}
                  {!store.books[0] &&
                  <tr>
                    <td>No data available</td>
                    <td/>
                  </tr>
                  }
                  </tbody>
                </table>
              </div>
            </div>
          </div>
          <div className={`store-bottom`}>
            <div className={`store-date`}>
              <span>{getDateFormat(store.establishmentDate)}</span>
              {' - '}
              <span style={{whiteSpace: 'nowrap'}}>{store.website.replace('https://', '')}</span>
            </div>
            <div className={`store-flag`}>
              <LazyLoadImage
                  alt={store.countries.code}
                  src={store.countries.flag}
                  visibleByDefault={visibleByDefault}
              />
            </div>
          </div>
        </div>
    )
  };

  return (
      <div className="App">
        <div className={`stores`}>

          {loading ?
              <div>Loading...</div>
              :
              <>
                {!stores[0] &&
                <>
                  <h2>No stores available at the moment :(</h2>
                  <p>Make sure book-store-api is running!</p>
                </>
                }

                {stores.map((store, i) =>{
                  return(
                      <Store
                          key={i}
                          store={store}
                          visibleByDefault={i==0}
                      />
                  )
                })}
              </>
          }

        </div>
      </div>
  );
}

export default App;
