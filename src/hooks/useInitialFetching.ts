import {useDispatch} from "react-redux";
import {useEffect, useState} from "react";
import {login} from "../requests/user"

const useInitialFetching = () => {
  const [isLoaded, setIsLoaded] = useState(false);

  const dispatch = useDispatch();

  useEffect(() => {
    login(dispatch)
      .then(() => setIsLoaded(true));
  }, [dispatch]);

  return isLoaded;
}


export default useInitialFetching;