function buildOrganizationalChart() {
  let controllerConfigFunc = function ($scope, $element) {
    this.$onInit = function() {
      // Compute datasource Angular model from input json data
      let NULLNODE = {
          value: " ",
          childs: []
      };
      this.NULLNODE = NULLNODE;

      let travelCreateTree = function (nodesInfo, data, lv) {
        let n = data.childs.length;
        if (n == 0) {
          nodesInfo[0]["leafCount"]++;
          if (nodesInfo[0]["depth"] < lv) {
            nodesInfo[0]["depth"] = lv + 1;
          }
        }
        else {
          for(let i = 0; i < n; i++) {
            let child = data.childs[i];
            child.parent = data;
            travelCreateTree(nodesInfo, child, lv + 1);
          }
        }
      };
      let travelCreateRenderNodes = function (nodes, data, lv) {
        // result is return value, it is width of branch
        let result = 0;
        // Process this node
        let n = data.childs.length;
        let thisnode = {
          "data": data,
          "width": 0,
          "style": null
        };
        // request a horizon div at line $lv by push $thisnode to $nodes[$lv]
        // nodes[0]: metadata
        // nodes[1]: root (depth level is 1)
        // nodes[2]: children of root (depth level is 2)
        // If else:
        //    nodes.length > lv: this depth level has some one traveled to,
        //                       an array exists, just push new node
        //                       ($thisnode) into such array
        //    else:              this depth level have not bean reached to,
        //                       we need create a new array before pushing.
        if (nodes.length > lv) {
          nodes[lv].push(thisnode);
        }
        else {
          nodes.push([thisnode]);
        }
        // Process child node
        if (n == 0) {
          // . My branch has width of 1 because i am a leaf node
          // . Travel verical line until reach to max depth to occupy space
          //   for this node in the verical line
          result = 1;
          if (lv < nodes[0]["depth"]) {
            travelCreateRenderNodes(nodes, NULLNODE, lv + 1);
          }
          // Result not change, it is still 1, since we are going to go down
          // on vertical line (no width span activities)
        }
        else {
          for(let i = 0; i < n; ++i) {
            result += travelCreateRenderNodes(nodes, data.childs[i], lv + 1);
          }
        }
        // Post-Process child node (continue process this node after
        // traveling childs)
        thisnode.width = result;
        return result;
      };
      // Clone datasource since we will alter its data
      let data = Object.assign({}, this.datasource);
      // Create parent node for root node
      data.parent = null;
      let nodes = [{
        "depth": 0,
        "leafCount": 0
      }];
      // @TODO: validate input data
      // Current version assuming that tree has a not null root (valid data)
      travelCreateTree(nodes, data, 1);
      travelCreateRenderNodes(nodes, data, 1);
      this.tree = nodes[0];
      // Remove metadata before passing datasource to Angular component
      nodes.shift();
      this.nodes = nodes;
    }

    this.$postLink = function() {
      const DEFAULT_PARAMS = {
        "width":  "50",
        "height": "25",
        "hspace": "25",
        "vspace": "25",
        "border": "1",
        "borderStyle": "solid"
      };
      // Default params setting applying
      for (let key in DEFAULT_PARAMS) {
        if (typeof this[key] != "string") {
          this[key] = DEFAULT_PARAMS[key];
        }
      }

      // Tree are rendered as below:
      //   . Node is positioned to tree presentation as an html div tag
      //   . Arcs are drawed by an html canvas which positioned as a
      //     background image for div tags.


      // Position node into tree by compute style css
      // @TODO: make sure horizontal dimension is even to be divided by 2, 4
      // WIDH should be round so that it is even
      const WIDTH  = parseInt(this.width); 
      const HEIGHT = parseInt(this.height);
      const HSPACE = parseInt(this.hspace);
      const VSPACE = parseInt(this.vspace);
      const BORDER = parseInt(this.border);
      const HALF_HSPACE   = HSPACE / 2
      const HALF_VSPACE   = VSPACE / 2;
      const HALF_VSPACEPX = HALF_VSPACE + "px";
      const DOUBLE_BORDER = BORDER * 2;
      const HALF_WIDTH    = WIDTH / 2;
      const HALF_HEIGHT   = HEIGHT / 2;
      const NORMAL_WIDTH  = WIDTH  - DOUBLE_BORDER;
      const NORMAL_HEIGHT = HEIGHT - DOUBLE_BORDER
      const BORDER_STYLE = this.borderStyle;
      const HALF_CELLW_OCCUPATION = HALF_WIDTH + HALF_HSPACE;
      const CELLW_OCCUPATION      = HALF_CELLW_OCCUPATION * 2;
      const HALF_CELLH_OCCUPATION = HALF_HEIGHT + HALF_VSPACE;
      const CELLH_OCCUPATION      = HALF_CELLH_OCCUPATION * 2;

      let nodes = this.nodes;
      let n = nodes.length;
      for(let i = 0; i < n; i++) {
        let m = nodes[i].length;
        for (let j = 0; j < m; j++) {
          let node = nodes[i][j];
          let isnull = (node.data === this.NULLNODE);
          let bwidth = isnull ? 0 : BORDER;
          let bstyle = bwidth == 0 ? "none" : BORDER_STYLE;
          let padding =
            (
              (node.width - 1) * HALF_CELLW_OCCUPATION
              + HALF_HSPACE
            )
            + "px";
          // compute style
          node.style = {
            "width":         (isnull ? WIDTH  : NORMAL_WIDTH)  + "px",
            "height":        (isnull ? HEIGHT : NORMAL_HEIGHT) + "px",
            "border-width":  bwidth + "px",
            "border-style":  bstyle,
            "margin-top":    HALF_VSPACEPX,
            "margin-bottom": HALF_VSPACEPX,
            "margin-left":   padding,
            "margin-right":  padding,
            "text-align":    "center"
          }
        }
      }

      let tree = this.tree;
      let treewidth  = tree.leafCount *  CELLW_OCCUPATION;
      let treeheight = tree.depth * CELLH_OCCUPATION;
      

      // Create canvas and make it as backgroud image of the tree divs
      // The lay out is as below:
      //   <wrap div 'position: relative;'>
      //     <bgDiv 'position: absolute;'>
      //        <canvas>
      //         <!--
      //            will be rendered programmatically by javascript as
      //            below code
      //         -->
      //        </canvas>
      //     </bgDiv>
      //     <template div 'position: absolute;'>
      //         <!-- 
      //            house nodes, will be rendered by AngularJS
      //            from information in $node.style
      //         -->
      //     </template div>
      //   </wrap div>
      let bgDiv = document.createElement("div");
      bgDiv.style["position"] = "absolute";
      bgDiv.style["z-index"]  = -1;
      bgDiv.style["left"]     = "0px";
      bgDiv.style["top"]      = "0px";
      bgDiv.style["width"]    = treewidth + "px";
      bgDiv.style["height"]   = treeheight + "px";
      bgDiv.style["border-width"] = "0px";
      bgDiv.style["border-style"] = "none";
      bgDiv.style["margin"]       = "0px 0px 0px 0px";
      $element.prepend(bgDiv);
      $element.wrap(
        "<div style='position: relative; height: "
        + treeheight
        + "px;'></div>"
      );
      let arcsCanvas = document.createElement("canvas");
      bgDiv.appendChild(arcsCanvas)
      arcsCanvas.width=treewidth;
      arcsCanvas.height=treeheight;

      // draw arc
      let ctx = arcsCanvas.getContext("2d");

      // @TODO customize color as input parameter
      ctx.fillStyle = "#000000";
      let y = 0;
      let arc_weight = 1;
      const ARC_BEGIN_V_SHIFT = CELLH_OCCUPATION - HALF_VSPACE;
      const QUARTER_CELLH_OCCUPATION = HALF_CELLH_OCCUPATION / 2;
      const ARC_JOIN_LINE_V_SHIFT =
        ARC_BEGIN_V_SHIFT
        + QUARTER_CELLH_OCCUPATION;
      for(let i = 0; i < n; i++) {
        let m = nodes[i].length;
        let x = 0;
        let parentSibling = null;
        for (let j = 0; j < m; j++) {
          let node = nodes[i][j];
          let myParent = node.data.parent;
          // This node acts as parent
          // just for the case that it has children
          if (node.data.childs.length > 0) {
            // draw v-line down
            ctx.fillRect(
              x + (node.width * HALF_CELLW_OCCUPATION),
              y + ARC_BEGIN_V_SHIFT,
              arc_weight,
              QUARTER_CELLH_OCCUPATION + 1
            );
          }

          // This node acts as child (since i == 0 => it is root node)
          if (i > 0) {
            // draw a h-line up to parent touching to h-line
            if (node.data.value != " ") {
              ctx.fillRect(
                x + (node.width * HALF_CELLW_OCCUPATION),
                y,
                arc_weight,
                QUARTER_CELLH_OCCUPATION
              );

              let drawLeftPortion = true;
              let drawRightPortion = true;

              if (parentSibling != myParent) {
                // I am the first child in the sibling list
                parentSibling = myParent;
                // Please do not draw the left side of h-line portion
                drawLeftPortion = false;
              }
              // I am the last child in the sibling list
              if (j + 1 >= m || nodes[i][j+1].data.parent != parentSibling) {
                // Please do not draw the right side of h-line portion
                drawRightPortion = false;
              }

              if (drawLeftPortion) {
                ctx.fillRect(
                  x,
                  y,
                  (node.width * HALF_CELLW_OCCUPATION),
                  arc_weight
                );
              }

              if (drawRightPortion) {
                ctx.fillRect(
                  x + (node.width * HALF_CELLW_OCCUPATION),
                  y,
                  (node.width * HALF_CELLW_OCCUPATION),
                  arc_weight
                );
              }
            }
          }
          x += node.width * CELLW_OCCUPATION;
        }
        y += CELLH_OCCUPATION;
      }
    }
  };


  let templateStr = "<div style=\"position: absolute; z-index: 1; left: 0px; top: 0px; border-width: 0px; border-style: none; margin: 0px 0px 0px 0px;\"> <div ng-repeat=\"cols in $ctrl.nodes\" ng-style=\"{'display' : 'flex'}\"> <div ng-repeat=\"col in cols\" ng-style=\"{{col.style}}\"> {{col.data.value}} </div> </div> </div>";
  let bindingCfg = {
    width:        "@",
    height:       "@",
    hspace:       "@",
    vspace:       "@",
    border:       "@",
    datasource:   "<",
    borderStyle:  "@"
  };
  let result = {
    template:   templateStr,
    controller: controllerConfigFunc,
    bindings:   bindingCfg
  };
  return result;
}
