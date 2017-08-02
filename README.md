A non-recursive R-Tree library for 2D rectangles in pure JavaScript with no dependencies. This library
has been refactored by Kristian Gray <https://github.com/KrisGray> into typescript
and utilises OO principals. This libray can now be installed via npm with the following
command:

npm install --save https://github.com/HGNC/RTree.git#release

How to use:

```Typescript
// create a new rtree object
const rt = new RTree();

// insert root rectangle and sub rectangles
const rects = [
  { x: 1, y: 1, w: 4, h: 4 },
  { x: 2, y: 3, w: 1, h: 1 },
  { x: 3, y: 2, w: 1, h: 1 },
  { x: 6, y: 4, w: 1, h: 1 },
  { x: 4, y: 1, w: 2, h: 1 }
];
for (let i=0; i<rects.length; i++){
  rt.insert(rects[i], `store obj ${i}`);
}

// Search for rectangles (rTrees.length === 4)
const rTrees: RTree[] = rt.search({
  x: 1, y: 1, w: 4, h: 4
});

// remove rectangles (rmRTrees.length === 3)
const rmRTrees: RTrees[] = rt.remove({
  x: 1, y: 1, w: 3, h: 4
});

// rt.nodes.length === 2

```
