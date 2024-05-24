import Info from './Info';
import SkillsAndHobbies from './SkillsAndHobbies';
import Heading from './Heading';

import './index.scss';

const About = () => {
  return (
    <section id="about" class="about">
      <Heading />
      <Info />
      <SkillsAndHobbies />
    </section>
  );
};

export default About;
