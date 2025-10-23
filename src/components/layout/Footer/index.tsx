import { FC } from 'react';
import {Link, useLocation} from "react-router-dom";
import pageRoutes from "../../../consts/pageRoutes.ts";
import styles from "./Footer.module.scss";
import classNames from "classnames";

const Footer: FC = () => {
  const location = useLocation();

  const footerLinks = [
    {
      name: "Main page",
      route: pageRoutes.MAIN,
      icon: "/img/footer/icon.png",
    }
  ];

  return (
    <footer className={classNames(styles.footer, "bg-bg")}>
      <div className={styles.footerContent}>
        <nav className={styles.pageLinks}>
          {footerLinks.map((link, index) => (
            <Link
              key={index}
              className={classNames(styles.pageLink, location.pathname === link.route ? styles.active : "")}
              to={link.route}
            >
              <img src={link.icon} alt="" width={22} />
              <p>{link.name}</p>
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  );
};

export default Footer;
