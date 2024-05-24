import { links } from "@utils/constants.ts";

import "./index.scss";

const Header = () => {
  return (
    <header>
      <Title />
      <NavBar />
    </header>
  );
};

export default Header;

const Title = () => {
  return (
    <div class="title">
      <img
        src="https://placehold.co/10x10"
        alt="logo"
        height="20px"
        width="20px"
      />
      <h1>
        <a href="/" rel="noreferrer">
          Sahil Singh Rana
        </a>
      </h1>
    </div>
  );
};

const NavBar = () => {
  return (
    <nav>
      <NavLink url={links.about} label="About" />
      <NavLink url={links.contact} label="Contact" />
      <NavLink url={links.projects} label="Projects" />
      <NavLink url={links.blog} label="Blog" />
      <NavLink url={links.github} label="Github" />
    </nav>
  );
};

const NavLink = ({ url, label }) => {
  return <a href={url}>{label}</a>;
};
