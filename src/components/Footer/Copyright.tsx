import { Copyright as CopyrightIcon } from 'lucide-solid';

const Copyright = () => {
  return (
    <p class="copyright">
      <CopyrightIcon />
      {new Date().getFullYear()} Sahil Singh Rana
    </p>
  );
};

export default Copyright;
