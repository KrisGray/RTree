import RectLike from './rtree/rect-like';
import Rectangle from './rtree/rectangle';

export default class RTree {
  private Min_Width = 3; // Minimum width of any node before a merge
  private Max_Width = 6; // Maximum width of any node before a split
  private idCache: any;
  x = 0;
  y = 0;
  w = 0;
  h = 0;
  id = 'root';
  nodes: RTree[];
  leaf: any;
  load: any;
  target: any;

  private static isArray(o: any): boolean {
    return Object.prototype.toString.call(o) === '[object Array]';
  };

  constructor(width?: number) {
    if (!isNaN(width)) {
      this.Min_Width = Math.floor(width / 2.0);
      this.Max_Width = width;
    }
  }

  /* @function
	 * @description Function to generate unique strings for element IDs
	 * @param {String} n			The prefix to use for the IDs generated.
	 * @return {String}				A guarenteed unique ID.
	 */
  private name_to_id(idPrefix: string): string {
    let idVal = 0;
    if (idPrefix in this.idCache) {
      idVal = this.idCache[idPrefix]++;
    } else {
      this.idCache[idPrefix] = 0;
    }
    return idPrefix + "_" + idVal;
  }

  /* find the best specific node(s) for object to be deleted from
	 * [ leaf node parent ] = _remove_subtree(rectangle, object, root)
	 * @private
	 */
  private remove_subtree = function (rect: RectLike, obj: any) {
    const hit_stack: RTree[] = []; // Contains the elements that overlap
    const count_stack: number[] = []; // Contains the elements that overlap
    let ret_array: RTree[] = [];
    let current_depth = 1;

    if (!rect || !Rectangle.overlap_rectangle(rect, this)) {
      return ret_array;
    }

    const ret_obj = new RTree();
    ret_obj.x = rect.x;
    ret_obj.y = rect.y;
    ret_obj.w = rect.w;
    ret_obj.h = rect.h;
    ret_obj.target = obj;

    count_stack.push(this.nodes.length);
    hit_stack.push(this);

    do {
      let tree: RTree = hit_stack.pop();
      let i = count_stack.pop() - 1;

      if ("target" in ret_obj) { // We are searching for a target
        while (i >= 0) {
          const ltree = tree.nodes[i];
          if (Rectangle.overlap_rectangle(ret_obj, ltree)) {
            if ((ret_obj.target && "leaf" in ltree && ltree.leaf === ret_obj.target) ||
              (!ret_obj.target && ("leaf" in ltree || Rectangle.contains_rectangle(ltree, ret_obj)))) { // A Match !!
              // Yup we found a match...
              // we can cancel search and start walking up the list
              if ("nodes" in ltree) { // If we are deleting a node not a leaf...
                ret_array = this.search_subtree(ltree, true, [], ltree);
                tree.nodes.splice(i, 1);
              } else {
                ret_array = tree.nodes.splice(i, 1);
              }
              // Resize MBR down...
              Rectangle.make_MBR(tree.nodes, tree);
              delete ret_obj.target;
              if (tree.nodes.length < this.Min_Width) { // Underflow
                ret_obj.nodes = this.search_subtree(tree, true, [], tree);
              }
              break;
            }
						/*	else if("load" in ltree) { // A load
										  	}*/
            else if ("nodes" in ltree) { // Not a Leaf
              current_depth += 1;
              count_stack.push(i);
              hit_stack.push(tree);
              tree = ltree;
              i = ltree.nodes.length;
            }
          }
          i -= 1;
        }
      } else if ("nodes" in ret_obj) { // We are unsplitting
        tree.nodes.splice(i + 1, 1); // Remove unsplit node
        // ret_obj.nodes contains a list of elements removed from the tree so far
        if (tree.nodes.length > 0)
          Rectangle.make_MBR(tree.nodes, tree);
        for (var t = 0; t < ret_obj.nodes.length; t++)
          this.insert_subtree(ret_obj.nodes[t], tree);
        ret_obj.nodes.length = 0;
        if (hit_stack.length == 0 && tree.nodes.length <= 1) { // Underflow..on root!
          ret_obj.nodes = this.search_subtree(tree, true, ret_obj.nodes, tree);
          tree.nodes.length = 0;
          hit_stack.push(tree);
          count_stack.push(1);
        } else if (hit_stack.length > 0 && tree.nodes.length < this.Min_Width) { // Underflow..AGAIN!
          ret_obj.nodes = this.search_subtree(tree, true, ret_obj.nodes, tree);
          tree.nodes.length = 0;
        } else {
          delete ret_obj.nodes; // Just start resizing
        }
      } else { // we are just resizing
        Rectangle.make_MBR(tree.nodes, tree);
      }
      current_depth -= 1;
    } while (hit_stack.length > 0);

    return (ret_array);
  }

  /* choose the best damn node for rectangle to be inserted into
	 * [ leaf node parent ] = _choose_leaf_subtree(rectangle, root to start search at)
	 * @private
	 */
  private choose_leaf_subtree(rect: RectLike): RTree[] {
    let best_choice_index = -1;
    const best_choice_stack: RTree[] = [];
    let best_choice_area: number;

    best_choice_stack.push(this);
    let nodes = this.nodes;

    do {
      if (best_choice_index != -1) {
        best_choice_stack.push(nodes[best_choice_index]);
        nodes = nodes[best_choice_index].nodes;
        best_choice_index = -1;
      }

      for (let i = nodes.length - 1; i >= 0; i--) {
        const ltree = nodes[i];
        if ("leaf" in ltree) {
          // Bail out of everything and start inserting
          best_choice_index = -1;
          break;
        }
        // Area of new enlarged rectangle
        const old_lratio = Rectangle.squarified_ratio(ltree.w, ltree.h, ltree.nodes.length + 1);

        // Enlarge rectangle to fit new rectangle
        const nw = Math.max(ltree.x + ltree.w, rect.x + rect.w) - Math.min(ltree.x, rect.x);
        const nh = Math.max(ltree.y + ltree.h, rect.y + rect.h) - Math.min(ltree.y, rect.y);

        // Area of new enlarged rectangle
        var lratio = Rectangle.squarified_ratio(nw, nh, ltree.nodes.length + 2);

        if (best_choice_index < 0 || Math.abs(lratio - old_lratio) < best_choice_area) {
          best_choice_area = Math.abs(lratio - old_lratio);
          best_choice_index = i;
        }
      }
    } while (best_choice_index != -1);

    return best_choice_stack;
  }

  /* insert the best source rectangle into the best fitting parent node: a or b
	 * [] = pick_next(array of source nodes, target node array a, target node array b)
	 * @private
	 */
  private pick_next(nodes: RTree[], a: RTree, b: RTree) {
    // Area of new enlarged rectangle
    const area_a = Rectangle.squarified_ratio(a.w, a.h, a.nodes.length + 1);
    const area_b = Rectangle.squarified_ratio(b.w, b.h, b.nodes.length + 1);
    let high_area_delta: number;
    let high_area_node: number;
    let lowest_growth_group: RTree;

    for (let i = nodes.length - 1; i >= 0; i--) {
      const l = nodes[i];
      const new_area_a = new RTree();
      new_area_a.x = Math.min(a.x, l.x);
      new_area_a.y = Math.min(a.y, l.y);
      new_area_a.w = Math.max(a.x + a.w, l.x + l.w) - Math.min(a.x, l.x);
      new_area_a.h = Math.max(a.y + a.h, l.y + l.h) - Math.min(a.y, l.y);

      const change_new_area_a = Math.abs(Rectangle.squarified_ratio(new_area_a.w, new_area_a.h, a.nodes.length + 2) - area_a);

      const new_area_b = new RTree();
      new_area_b.x = Math.min(b.x, l.x);
      new_area_b.y = Math.min(b.y, l.y);
      new_area_b.w = Math.max(b.x + b.w, l.x + l.w) - Math.min(b.x, l.x);
      new_area_b.h = Math.max(b.y + b.h, l.y + l.h) - Math.min(b.y, l.y);
      const change_new_area_b = Math.abs(Rectangle.squarified_ratio(new_area_b.w, new_area_b.h, b.nodes.length + 2) - area_b);

      if (!high_area_node || !high_area_delta || Math.abs(change_new_area_b - change_new_area_a) < high_area_delta) {
        high_area_node = i;
        high_area_delta = Math.abs(change_new_area_b - change_new_area_a);
        lowest_growth_group = change_new_area_b < change_new_area_a ? b : a;
      }
    }
    const temp_node = nodes.splice(high_area_node, 1)[0];
    if (a.nodes.length + nodes.length + 1 <= this.Min_Width) {
      a.nodes.push(temp_node);
      Rectangle.expand_rectangle(a, temp_node);
    } else if (b.nodes.length + nodes.length + 1 <= this.Min_Width) {
      b.nodes.push(temp_node);
      Rectangle.expand_rectangle(b, temp_node);
    } else {
      lowest_growth_group.nodes.push(temp_node);
      Rectangle.expand_rectangle(lowest_growth_group, temp_node);
    }
  }

  /* pick the "best" two starter nodes to use as seeds using the "linear" criteria
	 * [ an array of two new arrays of nodes ] = pick_linear(array of source nodes)
	 * @private
	 */
  private pick_linear(nodes: RTree[]): RTree[] {
    let lowest_high_x = nodes.length - 1;
    let highest_low_x = 0;
    let lowest_high_y = nodes.length - 1;
    let highest_low_y = 0;
    let t1, t2;

    for (let i = nodes.length - 2; i >= 0; i--) {
      const l = nodes[i];
      if (l.x > nodes[highest_low_x].x) highest_low_x = i;
      else if (l.x + l.w < nodes[lowest_high_x].x + nodes[lowest_high_x].w) lowest_high_x = i;
      if (l.y > nodes[highest_low_y].y) highest_low_y = i;
      else if (l.y + l.h < nodes[lowest_high_y].y + nodes[lowest_high_y].h) lowest_high_y = i;
    }
    const dx = Math.abs((nodes[lowest_high_x].x + nodes[lowest_high_x].w) - nodes[highest_low_x].x);
    const dy = Math.abs((nodes[lowest_high_y].y + nodes[lowest_high_y].h) - nodes[highest_low_y].y);
    if (dx > dy) {
      if (lowest_high_x > highest_low_x) {
        t1 = nodes.splice(lowest_high_x, 1)[0];
        t2 = nodes.splice(highest_low_x, 1)[0];
      } else {
        t2 = nodes.splice(highest_low_x, 1)[0];
        t1 = nodes.splice(lowest_high_x, 1)[0];
      }
    } else {
      if (lowest_high_y > highest_low_y) {
        t1 = nodes.splice(lowest_high_y, 1)[0];
        t2 = nodes.splice(highest_low_y, 1)[0];
      } else {
        t2 = nodes.splice(highest_low_y, 1)[0];
        t1 = nodes.splice(lowest_high_y, 1)[0];
      }
    }
    const node1 = new RTree();
    node1.x = t1.x;
    node1.y = t1.y;
    node1.w = t1.w;
    node1.h = t1.h;
    node1.nodes = [t1];
    const node2 = new RTree();
    node2.x = t2.x;
    node2.y = t2.x;
    node2.w = t2.x;
    node2.h = t2.x;
    node2.nodes = [t2];
    return ([node1, node2]);
  }

  /* split a set of nodes into two roughly equally-filled nodes
	 * [ an array of two new arrays of nodes ] = linear_split(array of nodes)
	 * @private
	 */
  private linear_split(nodes: RTree[]): RTree[] {
    const n: RTree[] = this.pick_linear(nodes);
    while (nodes.length > 0) {
      this.pick_next(nodes, n[0], n[1]);
    }
    return n;
  }

  private attach_data(tree: RTree): RTree {
    this.nodes = tree.nodes;
    this.x = tree.x;
    this.y = tree.y;
    this.w = tree.w;
    this.h = tree.h;
    return this;
  }

  /* non-recursive internal search function 
	 * [ nodes | objects ] = _search_subtree(rectangle, [return node data], [array to fill], root to begin search at)
	 * @private
	 */
  private search_subtree(rect: RectLike, return_node: boolean, return_array: RTree[]): RTree[] {
    const hitStack: any[] = [];
    if (!Rectangle.overlap_rectangle(rect, this)) {
      return return_array;
    }
    const nodes = this.nodes;
    hitStack.push(nodes);
    do {
      const nodes = hitStack.pop();
      for (let i = nodes.length - 1; i >= 0; i--) {
        const ltree = nodes[i];
        if (Rectangle.overlap_rectangle(rect, ltree)) {
          if ("nodes" in ltree) { // Not a Leaf
            hitStack.push(ltree.nodes);
          } else if ("leaf" in ltree) { // A Leaf !!
            if (!return_node) {
              return_array.push(ltree.leaf);
            } else {
              return_array.push(ltree);
            }
          }
        }
      }
    } while (hitStack.length > 0);
    return return_array;
  }

  /* non-recursive internal insert function
	 * [] = _insert_subtree(rectangle, object to insert, root to begin insertion at)
	 * @private
	 */
  private insert_subtree(node: RTree): void {
    let bc; // Best Current node
    // Initial insertion is special because we resize the Tree and we don't
    // care about any overflow (seriously, how can the first object overflow?)
    if (typeof (this.nodes) === "undefined" || this.nodes.length === 0) {
      this.x = node.x;
      this.y = node.y;
      this.w = node.w;
      this.h = node.h;
      this.nodes = [node];
      return;
    }

    // Find the best fitting leaf node
    // choose_leaf returns an array of all tree levels (including root)
    // that were traversed while trying to find the leaf
    const tree_stack = this.choose_leaf_subtree(node);
    let ret_obj: RTree | RTree[] = node; //{x:rect.x,y:rect.y,w:rect.w,h:rect.h, leaf:obj};

    // Walk back up the tree resizing and inserting as needed
    do {
      //handle the case of an empty node (from a split)
      if (bc && "nodes" in bc && bc.nodes.length == 0) {
        const pbc = bc; // Past bc
        bc = tree_stack.pop();
        for (let t = 0; t < bc.nodes.length; t++)
          if (bc.nodes[t] === pbc || bc.nodes[t].nodes.length == 0) {
            bc.nodes.splice(t, 1);
            break;
          }
      } else {
        bc = tree_stack.pop();
      }

      // If there is data attached to this ret_obj
      if ("leaf" in ret_obj || "nodes" in ret_obj || RTree.isArray(ret_obj)) {
        // Do Insert
        if (RTree.isArray(ret_obj)) {
          for (let ai = 0; ai < (<RTree[]>ret_obj).length; ai++) {
            Rectangle.expand_rectangle(bc, ret_obj[ai]);
          }
          bc.nodes = bc.nodes.concat(ret_obj);
        } else {
          Rectangle.expand_rectangle(bc, <RTree>ret_obj);
          bc.nodes.push(ret_obj); // Do Insert
        }

        if (bc.nodes.length <= this.Max_Width) { // Start Resizeing Up the Tree
          ret_obj = new RTree();
          ret_obj.x = bc.x;
          ret_obj.y = bc.y;
          ret_obj.w = bc.w;
          ret_obj.h = bc.h;
        } else { // Otherwise Split this Node
          // linear_split() returns an array containing two new nodes
          // formed from the split of the previous node's overflow
          const a = this.linear_split(bc.nodes);
          ret_obj = a; //[1];

          if (tree_stack.length < 1) { // If are splitting the root..
            bc.nodes.push(a[0]);
            tree_stack.push(bc); // Reconsider the root element
            ret_obj = a[1];
          }
					/*else {
						delete bc;
					}*/
        }
      } else { // Otherwise Do Resize
        //Just keep applying the new bounding rectangle to the parents..
        Rectangle.expand_rectangle(bc, <RTree>ret_obj);
        ret_obj = new RTree();
        ret_obj.x = bc.x;
        ret_obj.y = bc.y;
        ret_obj.w = bc.w;
        ret_obj.h = bc.h;
      }
    } while (tree_stack.length > 0);
  }

  /* quick 'n' dirty function for plugins or manually drawing the tree
	 * [ tree ] = RTree.get_tree(): returns the raw tree data. useful for adding
	 * @public
	 * !! DEPRECATED !!
	 */
  get_tree(): RTree {
    return this;
  }

  /* quick 'n' dirty function for plugins or manually loading the tree
	 * [ tree ] = RTree.set_tree(sub-tree, where to attach): returns the raw tree data. useful for adding
	 * @public
	 * !! DEPRECATED !!
	 */
  set_tree(new_tree: RTree): RTree {
    return this.attach_data(new_tree);
  }

  /* non-recursive search function 
	 * [ nodes | objects ] = RTree.search(rectangle, [return node data], [array to fill])
	 * @public
	 */
  search(rect: RTree, return_node?: boolean, return_array?: RTree[]): RTree[] {
    if (arguments.length < 1)
      throw "Wrong number of arguments. RT.Search requires at least a bounding rectangle."

    switch (arguments.length) {
      case 1:
        arguments[1] = false; // Add an "return node" flag - may be removed in future
      case 2:
        arguments[2] = []; // Add an empty array to contain results
      default:
        arguments.length = 3;
    }
    return this.search_subtree(arguments[0], arguments[1], arguments[2]);
  }

  /* partially-recursive toJSON function
	 * [ string ] = RTree.toJSON([rectangle], [tree])
	 * @public
	 */
  toJSON(rect: RectLike, tree: RTree): string {
    const hit_stack: any[] = []; // Contains the elements that overlap
    const count_stack: number[] = []; // Contains the elements that overlap
    const return_stack: { [key: string]: string } = {}; // Contains the elements that overlap
    let max_depth = 3; // This triggers recursion and tree-splitting
    let current_depth = 1;
    let return_string = "";

    if (rect && !Rectangle.overlap_rectangle(rect, this)) {
      return "";
    }

    if (!tree) {
      count_stack.push(this.nodes.length);
      hit_stack.push(this.nodes);
      return_string += "var main_tree = {x:" + this.x.toFixed() + ",y:" + this.y.toFixed() + ",w:" + this.w.toFixed() + ",h:" + this.h.toFixed() + ",nodes:[";
    } else {
      max_depth += 4;
      count_stack.push(tree.nodes.length);
      hit_stack.push(tree.nodes);
      return_string += "var main_tree = {x:" + tree.x.toFixed() + ",y:" + tree.y.toFixed() + ",w:" + tree.w.toFixed() + ",h:" + tree.h.toFixed() + ",nodes:[";
    }

    do {
      let nodes: RTree[] = hit_stack.pop();
      let i = count_stack.pop() - 1;

      if (i >= 0 && i < nodes.length - 1)
        return_string += ",";

      while (i >= 0) {
        const ltree = nodes[i];
        if (!rect || Rectangle.overlap_rectangle(rect, ltree)) {
          if (ltree.nodes) { // Not a Leaf
            if (current_depth >= max_depth) {
              const len = return_stack.length;
              const nam = this.name_to_id("saved_subtree");
              return_string += "{x:" + ltree.x.toFixed() + ",y:" + ltree.y.toFixed() + ",w:" + ltree.w.toFixed() + ",h:" + ltree.h.toFixed() + ",load:'" + nam + ".js'}";
              return_stack[nam] = this.toJSON(rect, ltree);
              if (i > 0)
                return_string += ","
            } else {
              return_string += "{x:" + ltree.x.toFixed() + ",y:" + ltree.y.toFixed() + ",w:" + ltree.w.toFixed() + ",h:" + ltree.h.toFixed() + ",nodes:[";
              current_depth += 1;
              count_stack.push(i);
              hit_stack.push(nodes);
              nodes = ltree.nodes;
              i = ltree.nodes.length;
            }
          } else if (ltree.leaf) { // A Leaf !!
            const data = ltree.leaf.toJSON ? ltree.leaf.toJSON() : JSON.stringify(ltree.leaf);
            return_string += "{x:" + ltree.x.toFixed() + ",y:" + ltree.y.toFixed() + ",w:" + ltree.w.toFixed() + ",h:" + ltree.h.toFixed() + ",leaf:" + data + "}";
            if (i > 0)
              return_string += ","
          } else if (ltree.load) { // A load
            return_string += "{x:" + ltree.x.toFixed() + ",y:" + ltree.y.toFixed() + ",w:" + ltree.w.toFixed() + ",h:" + ltree.h.toFixed() + ",load:'" + ltree.load + "'}";
            if (i > 0)
              return_string += ","
          }
        }
        i -= 1;
      }
      if (i < 0) {
        return_string += "]}";
        current_depth -= 1;
      }
    } while (hit_stack.length > 0);

    return_string += ";";

    for (const my_key in return_stack) {
      return_string += "\nvar " + my_key + " = function(){" + return_stack[my_key] + " return(main_tree);};";
    }
    console.log(return_string);
    return return_string;
  }

  /* remove function
	 * [] = RTree.remove(rectangle, object to remove)
	 */
  remove(rect: RectLike, obj: any): RTree[] {
    if (arguments.length < 1) {
      throw "Wrong number of arguments. RT.remove requires at least a bounding rectangle.";
    }

    switch (arguments.length) {
      case 1:
        arguments[1] = false; // obj == false for conditionals
      default:
        arguments.length = 2;
    }
    if (arguments[1] === false) { // Do area-wide delete
      var numberdeleted = 0;
      var ret_array = [];
      let i = 0;
      do {
        numberdeleted = ret_array.length;
        ret_array = ret_array.concat(this.remove_subtree(arguments[0], arguments[1]));
        i++;
      } while (numberdeleted !== ret_array.length)//(numberdeleted !== ret_array.length);
      return ret_array;
    } else { // Delete a specific item
      return this.remove_subtree(arguments[0], arguments[1]);
    }
  }

  /* non-recursive insert function
	 * [] = RTree.insert(rectangle, object to insert)
	 */
  insert(rect: RectLike, obj: any): void {
    if (arguments.length < 2)
      throw "Wrong number of arguments. RT.Insert requires at least a bounding rectangle and an object.";
    const rTree = new RTree();
    rTree.x = rect.x;
    rTree.y = rect.y;
    rTree.w = rect.w;
    rTree.h = rect.h;
    rTree.leaf = obj;
    this.insert_subtree(rTree);
  };

}