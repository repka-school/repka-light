// Every avatar and frame, in the order the pickers show them.
const set = {
  people: ["girl-braids", "girl-puffs", "girl-bob", "girl-ponytail", "boy-side", "boy-curls", "boy-glasses", "boy-cap", "woman-bun", "woman-long", "man-beard", "man-glasses"],
  animals: ["kitten", "puppy", "fox-cub", "hedgehog", "bunny", "bear-cub", "owlet", "panda", "raccoon", "frog", "penguin", "squirrel"],
  frames: ["none", "forest", "sea", "sun", "berry", "stars"],
};

export const avatarGroups: readonly { ids: readonly string[] }[] = [{ ids: set.people }, { ids: set.animals }];

export const avatarIds: readonly string[] = avatarGroups.flatMap((g) => g.ids);

export const frameIds: readonly string[] = set.frames;
