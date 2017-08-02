export interface RectLike {
  x: number;
  y: number;
  w: number;
  h: number;
  x2?: number;
  y2?: number;
  target?: any;
  
}

export class Rectangle {
  private _x: number = 0;
	private _y: number = 0;
	private _w: number = 0;
	private _h: number = 0;
	private _x2: number = 0;
	private _y2: number = 0;

  constructor(ix: RectLike | number, iy?: number, iw?: number, ih?: number){
    if (ix instanceof Object) {
      const rect = <RectLike>ix;
      this._x = rect.x;
      this._y = rect.y;
      if (rect.w !== 0 && !rect.w && rect.x2) {
        this._w = rect.x2 - rect.x;
        this._h = rect.y2 - rect.y;
      } else {
        this._w = rect.w;
        this._h = rect.h;
      }
      this._x2 = this.x + this.w;
      this._y2 = this.y + this.h; // For extra fastitude
    } else {
      this._x = ix;
      this._y = iy;
      this._w = iw;
      this._h = ih;
      this._x2 = this._x + this._w;
      this._y2 = this._y + this._h; // For extra fastitude
    }
  }

  get x(): number {
    return this._x;
  }

  get y(): number {
    return this._y;
  }

  get w(): number {
    return this._w;
  }

  get h(): number {
    return this._h;
  }

  get x2(): number {
    return this._x2;
  }

  get y2(): number {
    return this._y2;
  }

  toJSON() {
		return ('{"x":' + this.x.toString() + ', "y":' + this.y.toString() + ', "w":' + this.w.toString() + ', "h":' + this.h.toString() + '}');
	};

  overlap(a: RectLike): boolean {
		return (this.x < a.x2 && this.x2 > a.x && this.y < a.y2 && this.y2 > a.y);
  };
  
  expand(a: RectLike): Rectangle {
		const nx = Math.min(this.x, a.x);
		const ny = Math.min(this.y, a.y);
		this._w = Math.max(this.x2, a.x2) - nx;
		this._h = Math.max(this.y2, a.y2) - ny;
		this._x = nx;
		this._y = ny;
		return this;
  };

  // this skews insertions to prefering squarer and emptier nodes
  public static squarified_ratio(l: number, w: number, fill: number): number {
    // Area of new enlarged rectangle
    const lperi = (l + w) / 2.0; // Average size of a side of the new rectangle
    const larea = l * w; // Area of new rectangle
    // return the ratio of the perimeter to the area - the closer to 1 we are, 
    // the more "square" a rectangle is. conversly, when approaching zero the 
    // more elongated a rectangle is
    const lgeo = larea / (lperi * lperi);
    return (larea * fill / lgeo);
  };

  /* returns true if rectangle 1 overlaps rectangle 2
   * [ boolean ] = overlap_rectangle(rectangle a, rectangle b)
   * @static function
   */
  public static overlap_rectangle(a: RectLike, b: RectLike): boolean {
    return (a.x < (b.x + b.w) && (a.x + a.w) > b.x && a.y < (b.y + b.h) && (a.y + a.h) > b.y);
  };

  /* returns true if rectangle a is contained in rectangle b
   * [ boolean ] = contains_rectangle(rectangle a, rectangle b)
   * @static function
   */
  public static contains_rectangle(a: RectLike, b: RectLike): boolean {
    return ((a.x + a.w) <= (b.x + b.w) && a.x >= b.x && (a.y + a.h) <= (b.y + b.h) && a.y >= b.y);
  };

  /* expands rectangle A to include rectangle B, rectangle B is untouched
   * [ rectangle a ] = expand_rectangle(rectangle a, rectangle b)
   * @static function
   */
  public static expand_rectangle(a: RectLike, b: RectLike): RectLike {
    var nx = Math.min(a.x, b.x);
    var ny = Math.min(a.y, b.y);
    a.w = Math.max(a.x + a.w, b.x + b.w) - nx;
    a.h = Math.max(a.y + a.h, b.y + b.h) - ny;
    a.x = nx;
    a.y = ny;
    return a;
  };

  /* generates a minimally bounding rectangle for all rectangles in
   * array "nodes". If rect is set, it is modified into the MBR. Otherwise,
   * a new rectangle is generated and returned.
   * [ rectangle a ] = make_MBR(rectangle array nodes, rectangle rect)
   * @static function
   */
  public static make_MBR(nodes: RectLike[], rect: RectLike): RectLike {
    if (nodes.length < 1)
      return ({
        x: 0,
        y: 0,
        w: 0,
        h: 0
      });

    //throw "make_MBR: nodes must contain at least one rectangle!";
    if (!rect){
      rect = {
        x: nodes[0].x,
        y: nodes[0].y,
        w: nodes[0].w,
        h: nodes[0].h
      };
    } else {
      rect.x = nodes[0].x;
      rect.y = nodes[0].y;
      rect.w = nodes[0].w;
      rect.h = nodes[0].h;
    }
    for (var i = nodes.length - 1; i > 0; i--)
      Rectangle.expand_rectangle(rect, nodes[i]);

    return rect;
  };
}