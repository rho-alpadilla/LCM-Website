const upperCaseCharacters = "ABCDEFGHJKLMNPQRSTUVWXYZ";
const lowerCaseCharacters = "abcdefghijkmnopqrstuvwxyz";
const numberCharacters = "23456789";
const symbolCharacters = "!@#$%*+-_";
const allCharacters =
  upperCaseCharacters +
  lowerCaseCharacters +
  numberCharacters +
  symbolCharacters;

const temporaryPasswordLength = 20;

type RandomValues = (values: Uint32Array) => Uint32Array;

function characterAt(characters: string, randomValue: number) {
  return characters[randomValue % characters.length];
}

export function generateTemporaryPassword(
  getRandomValues: RandomValues = crypto.getRandomValues.bind(crypto),
) {
  const values = getRandomValues(new Uint32Array(temporaryPasswordLength));
  const requiredSets = [
    upperCaseCharacters,
    lowerCaseCharacters,
    numberCharacters,
    symbolCharacters,
  ];

  return Array.from({ length: temporaryPasswordLength }, (_, index) => {
    const characters = requiredSets[index] ?? allCharacters;
    return characterAt(characters, values[index]);
  }).join("");
}
