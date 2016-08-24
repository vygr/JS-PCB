"use strict";

var js_pcb = js_pcb || {};
(function()
{
	///////////////////////
	//distance metric stuff
	///////////////////////

	function manhattan_distance_2d(p1, p2)
	{
		let dx = p1[0] - p2[0];
		let dy = p1[1] - p2[1];
		return Math.abs(dx) + Math.abs(dy);
	}

	function manhattan_distance_3d(p1, p2)
	{
		let dx = p1[0] - p2[0];
		let dy = p1[1] - p2[1];
		let dz = p1[2] - p2[2];
		return Math.abs(dx) + Math.abs(dy) + Math.abs(dz);
	}

	function euclidean_distance_2d(p1, p2)
	{
		let dx = p1[0] - p2[0];
		let dy = p1[1] - p2[1];
		return Math.sqrt(dx * dx + dy * dy);
	}

	function euclidean_distance_3d(p1, p2)
	{
		let dx = p1[0] - p2[0];
		let dy = p1[1] - p2[1];
		let dz = p1[2] - p2[2];
		return Math.sqrt(dx * dx + dy * dy + dz * dz);
	}

	function squared_euclidean_distance_2d(p1, p2)
	{
		let dx = p1[0] - p2[0];
		let dy = p1[1] - p2[1];
		return dx * dx + dy * dy;
	}

	function squared_euclidean_distance_3d(p1, p2)
	{
		let dx = p1[0] - p2[0];
		let dy = p1[1] - p2[1];
		let dz = p1[2] - p2[2];
		return dx * dx + dy * dy + dz * dz;
	}

	function chebyshev_distance_2d(p1, p2)
	{
		let dx = Math.abs(p1[0] - p2[0]);
		let dy = Math.abs(p1[1] - p2[1]);
		return Math.max(dx, dy);
	}

	function chebyshev_distance_3d(p1, p2)
	{
		let dx = Math.abs(p1[0] - p2[0]);
		let dy = Math.abs(p1[1] - p2[1]);
		let dz = Math.abs(p1[2] - p2[2]);
		let d = Math.max(dx, dy);
		return Math.max(d, dz);
	}

	function reciprical_distance_2d(p1, p2)
	{
		let d = manhattan_distance_2d(p1, p2);
		if (d === 0.0) return 1.0;
		return 1.0 / d;
	}

	function reciprical_distance_3d(p1, p2)
	{
		let d = manhattan_distance_3d(p1, p2);
		if (d === 0.0) return 1.0;
		return 1.0 / d;
	}

	///////////////////////
	//specific vector stuff
	///////////////////////

	function equal_2d(n1, n2)
	{
		return (n1[0] === n2[0] && n1[1] === n2[1]);
	}

	function equal_3d(n1, n2)
	{
		return (n1[0] === n2[0] && n1[1] === n2[1] && n1[2] === n2[2]);
	}

	function add_2d(p1, p2)
	{
		return [p1[0] + p2[0], p1[1] + p2[1]];
	}

	function sub_2d(p1, p2)
	{
		return [p1[0] - p2[0], p1[1] - p2[1]];
	}

	function sub_3d(p1, p2)
	{
		return [p1[0] - p2[0], p1[1] - p2[1], p1[2] - p2[2]];
	}

	function scale_2d(p, s)
	{
		return [p[0] * s, p[1] * s];
	}

	function scale_3d(p, s)
	{
		return [p[0] * s, p[1] * s, p[2] * s];
	}

	function perp_2d(p)
	{
		return [-p[1], p[0]];
	}

	function dot_2d(p1, p2)
	{
		return p1[0] * p2[0] + p1[1] * p2[1];
	}

	function det_2d(p1, p2)
	{
		return p1[0] * p2[1] - p1[1] * p2[0];
	}

	function dot_3d(p1, p2)
	{
		return p1[0] * p2[0] + p1[1] * p2[1] + p1[2] * p2[2];
	}

	function length_2d(p)
	{
		return Math.sqrt(dot_2d(p, p));
	}

	function length_3d(p)
	{
		return Math.sqrt(dot_3d(p, p));
	}

	function norm_2d(p)
	{
		let l = length_2d(p);
		if (l === 0.0) return [0.0, 0.0];
		return scale_2d(p, 1.0 / l);
	}

	function norm_3d(p)
	{
		let l = length_3d(p);
		if (l === 0.0) return [0.0, 0.0, 0.0];
		return scale_3d(p, 1.0 / l);
	}

	function distance_2d(p1, p2)
	{
		return length_2d(sub_2d(p2, p1));
	}

	function distance_squared_2d(p1, p2)
	{
		let p = sub_2d(p2, p1);
		return dot_2d(p, p);
	}

	function distance_to_line_2d(p, p1, p2)
	{
		let lv = sub_2d(p2, p1);
		let pv = sub_2d(p, p1);
		let c1 = dot_2d(pv, lv);
		if (c1 <= 0.0) return distance_2d(p, p1);
		let c2 = dot_2d(lv, lv);
		if (c2 <= c1) return distance_2d(p, p2);
		return distance_2d(p, add_2d(p1, scale_2d(lv, c1/c2)));
	}

	function distance_squared_to_line_2d(p, p1, p2)
	{
		let lv = sub_2d(p2, p1);
		let pv = sub_2d(p, p1);
		let c1 = dot_2d(pv, lv);
		if (c1 <= 0.0) return distance_squared_2d(p, p1);
		let c2 = dot_2d(lv, lv);
		if (c2 <= c1) return distance_squared_2d(p, p2);
		return distance_squared_2d(p, add_2d(p1, scale_2d(lv, c1/c2)));
	}

	function collide_lines_2d(l1_p1, l1_p2, l2_p1, l2_p2)
	{
		let av = sub_2d(l1_p2, l1_p1);
		let bv = sub_2d(l2_p2, l2_p1);
		let cv = sub_2d(l2_p2, l1_p1);
		let axb = det_2d(av, bv);
		let axc = det_2d(av, cv);
		let cxb = det_2d(cv, bv);
		if (axb === 0.0) return false;
		if (axb > 0.0)
		{
			if ((axc < 0.0) || (axc > axb)) return false;
			if ((cxb < 0.0) || (cxb > axb)) return false;
		}
		else
		{
			if ((axc > 0.0) || (axc < axb)) return false;
			if ((cxb > 0.0) || (cxb < axb)) return false;
		}
		return true;
	}

	function collide_thick_lines_2d(tl1_p1, tl1_p2, tl2_p1, tl2_p2, r)
	{
		if (collide_lines_2d(tl1_p1, tl1_p2, tl2_p1, tl2_p2)) return true;
		r *= r;
		if (distance_squared_to_line_2d(tl2_p1, tl1_p1, tl1_p2) <= r) return true;
		if (distance_squared_to_line_2d(tl2_p2, tl1_p1, tl1_p2) <= r) return true;
		if (distance_squared_to_line_2d(tl1_p1, tl2_p1, tl2_p2) <= r) return true;
		if (distance_squared_to_line_2d(tl1_p2, tl2_p1, tl2_p2) <= r) return true;
		return false;
	}

	js_pcb.collide_thick_lines_2d = collide_thick_lines_2d;
	js_pcb.add_2d = add_2d;
	js_pcb.sub_2d = sub_2d;
	js_pcb.perp_2d = perp_2d;
	js_pcb.length_2d = length_2d;
	js_pcb.scale_2d = scale_2d;
	js_pcb.dot_2d = dot_2d;
	js_pcb.equal_2d = equal_2d;
	js_pcb.equal_3d = equal_3d;
})();
