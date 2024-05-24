const skills = [['React.js'], ['Node.js'], ['MongoDB']];
const hobbies = [['Music'], ['Trekking'], ['Technology']];

const SkillsAndHobbies = () => {
  return (
    <>
      <PillList title="Skills" className="Skills" pills={skills} />
      <PillList title="Hobbies" className="Hobbies" pills={hobbies} />
    </>
  );
};

export default SkillsAndHobbies;

const Pill = ({ text = '', link = '#' }) => {
  return (
    <a class="pill" href={link}>
      {text}
    </a>
  );
};

const PillList = ({ title, pills = [], className = '' }) => {
  return (
    <div id="title" class={`pillSection ${className}`}>
      <h2>{title}</h2>
      <ul>
        {pills.map((pill = []) => (
          <li>
            <Pill text={pill[0]} link={pill[1]} />
          </li>
        ))}
      </ul>
    </div>
  );
};
