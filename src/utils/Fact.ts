class Fact {
  fact = "";
  reference = "";
  description = "";
  descriptionRef = "";

  constructor(
    fact: string,
    reference?: string,
    description?: string,
    descriptionRef?: string,
  ) {
    this.fact = fact;
    this.reference = reference ?? "";
    this.description = description ?? "";
    this.descriptionRef = descriptionRef ?? "";
  }
}

export default Fact;
