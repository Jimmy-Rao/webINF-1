﻿var formidable = require('formidable');//表单提交处理
var dir=require('./newdirpath.js')
var fs=require('fs')

var User=require("../mongoose_db/Model/user.js")
var sina=require("../mongoose_db/Model/sinaSport.js")
var sinadetail=require("../mongoose_db/Model/sinadetail.js")
var Talkabout=require("../mongoose_db/Model/talkabout.js")
var Statuslist=require("../mongoose_db/Model/friendstatuslist.js")
var Active=require('../mongoose_db/Model/active.js')

var crypto=require('crypto');

module.exports= function(app){

	app.use(function(req,res,next){
		if(!req.session.user && !req.originalUrl.match('/login')  && !req.originalUrl.match('/weixin') && !req.originalUrl.match('/zhaopin')){
			res.redirect('/login')
		}else{
			next()
		}
	})
	

	app.get('/zhaopin',function(req,res){
		res.render('pages/zhaopin')
	})

	app.get("/weixin",function(req,res){
		var timestamp=req.query.timestamp;
		var nonce=req.query.nonce
		var echostr=req.query.echostr
		console.log("时间戳"+timestamp)
		console.log("核对码"+echostr) 
		var token='qaz123';
		var dict = [nonce,timestamp,token];

		var dict2=dict.sort().join('');
		var Signture = crypto.createHash("sha1").update(dict2).digest('hex');
		if( Signture==req.query.signature){
			res.send(echostr)
		}else{
			console.log('dict  '+dict)
			console.log('dict2   '+dict2)
			console.log(Signture)
			console.log(req.query.signature)
		}
	})
	//login
	app.get("/login",function(req,res){
		res.render('pages/login.pug',{
			title:'login'
		})
	})

	app.get('/',function(req,res){
		res.redirect('/index');
	})

	//index
	app.get('/index',function(req,res){
		//page2初始内容拉取5个新闻
		sina.find({}).sort({'_id':-1}).limit(5).exec(function(err,sina){
			if(err){
				console.log(err)
				res.send({stutas:'false'})
				return;
			}else{
				var newsCont=[];
				for(var i=0;i<5;i++){
					var news={
						title:'',
						src:'',
						href:'',
						time:''
					}
					news.title=sina[i].title;
					news.src=sina[i].src;
					news.id=sina[i]._id;
					news.time=sina[i].createTime;
					newsCont.push(news);
				};
				Active.find({}).sort({'_id':-1}).limit(50).exec(function(err,actives){
					var activelist=[];
					for(var mt in actives){
						var actcontent={
							activeID:actives[mt]._id,
							comment:actives[mt].comment.length,
							zan:actives[mt].zan.length,
							join:actives[mt].join.length,
							title:actives[mt].title,
							taps:actives[mt].taps,
							activeTime:actives[mt].activeTime
						}
						activelist.push(actcontent)
					}
					//好友详情
					User.findOne({username:req.session.user},function(err,user){
						var friends={
							concems:[],
							fans:[],
							statuslist:[]
						}
						//添加计步器
						var cont1=0;
						var cont2=0;
						for(var i in user.concems){
							cont1++;
							User.findOne({username:user.concems[i]},function(err,concems){
								friends.concems.push(concems);
								cont1--;
								if(cont1==0){
									for(var n in user.fans){
										cont2++;
										User.findOne({username:user.fans[n]},function(err,fans){
											if(fans){friends.fans.push(fans);};
											cont2--;
											if(cont2==0){
												Statuslist.findOne({username:req.session.user},function(err,statuslist){
													if(!!statuslist){
														//倒序排列
														var n=0;
														if(statuslist.content.length<5){
															for(var i=statuslist.content.length-1;i>=0;i--){
																friends.statuslist[n++]=statuslist.content[i]
															}
														}else{
															for(var i=statuslist.content.length-1;i>=statuslist.content.length-5;i--){
																friends.statuslist[n++]=statuslist.content[i]
															}
														}
													};
													res.render('index',{
														friends:friends,
														user:user,
														content:newsCont,
														activelists:activelist
													})
												})	
											}
										})
									}
								}
							})
						}	
					})
				})
			}
		})
	})
	//全文搜索 待更新
	app.post('/search',function(req,res){
		User.find({},function(err,users){
			var arr=[];
			for(i in users){
				users[i].password=undefined;
				arr.push(users[i])
			}
			res.send(arr)
		})
	})

	//tab2 无限滚动
	app.get('/news/newsCont',function(req,res){
		var lastindex=parseInt(req.query.Index);
		var newsCont=[];
		sina.find({}).sort({'_id':-1}).limit(lastindex+5).exec(function(err,sinas){
			if(err){
				console.log(err)
				res.send({stutas:'false'})
				return;
			}else{
				
				for(var i=lastindex;i<lastindex+5;i++){
					var news={
						title:'',
						src:'',
						href:'',
						time:''
					}
					news.href=sinas[i].href;
					news.title=sinas[i].title;
					news.src=sinas[i].src;
					news.id=sinas[i]._id;
					news.time=sinas[i].createTime;
					newsCont.push(news);
					
				};
				res.send(newsCont)
			}
		})
	})
	//tab1 无限滚动   闭包待处理
	app.get('/user/stutaslist',function(req,res){
		var lastindex=parseInt(req.query.Index);
		Statuslist.findOne({username:req.session.user},function(err,statuslist){
			var newCont=[];
			var n=0;
			for(var i =statuslist.content.length-lastindex;i>statuslist.content.length-lastindex-5&&i>=0;i--){
				var thisstatus=statuslist.content[i];
				var onestatus={
						concems:{},
						status:{}
					}
				onestatus.status=thisstatus;
				newCont.push(onestatus);
				User.findOne({username:thisstatus.username},function(err,thisConcem){
					thisConcem.password=undefined;
					newCont[n].concems=thisConcem;
					n++
					if(n==5){
						res.send(newCont)
					}
				})
			}
		})
	})
	//userdetailupdate 
	app.post('/user/detail',function(req,res){
		User.findOne({username:req.session.user},function(err,userdetail){
			userdetail.nicename=req.body.nicename;
			userdetail.sexy=req.body.sexy;
			userdetail.brithday=req.body.brithday;
			userdetail.sign=req.body.sign;
			userdetail.visible=req.body.visible;
			userdetail.save(function(err,detail){
				if(err){
					console.log(err)
					res.send({stutas:'false'})
					return;
				}
				else{
					res.send('success')
				}
			})
		})
	})

	//user/appendconcems 新增添加时在好友状态列表中添加对方已有状态
	app.post('/user/appendconcems',function(req,res){
		User.findOne({username:req.session.user},function(err,myself){
			var n=0;
			for(var i in myself.concems){
				if(myself.concems[i]==req.body.username){res.send({friendstatus:'0'});}
				else{
					n++;
					if(n==myself.concems.length){
						myself.concems.push(req.body.username);
						myself.save(function(){
							//查询被关注者历史状态
							Talkabout.findOne({username:req.body.username},function(err,talkabouts){
								var talkstatus=[];
								console.log(talkabouts)
								if(talkabouts){
									var contents=talkabouts.content;
									for(var i in contents){
										var onestatus={
											username:req.body.username,
											content:{}
										}
										onestatus.content=contents[i];
										talkstatus.push(onestatus);
									}
									Statuslist.findOne({username:req.session.user},function(err,statuslist){
										var all=statuslist.content;
										for(var i in talkstatus){
											all.push(talkstatus[i])
										}
										all.sort(function(a,b){
											if(a.createTime>b.createTime){
												return 1
											}else{
												return -1
											}
	        							});
	        							console.log(all)
	        							statuslist.content=all;
	        							statuslist.save();
									})
								}
							})
							
						});
						User.findOne({username:req.body.username},function(err,seachuser){
							seachuser.fans.push(myself.username);
							seachuser.save(function(){
								res.send({friendstatus:'1'});
							})
						})
					}
				}
			}
		})
		
	})

	//获取用户信息
	app.post('/user/getmsg',function(req,res){
		User.findOne({username:req.body.username},function(err,thisUse){
			var MSG=thisUse;
			MSG.password=undefined;
			res.send(MSG);
		})
	})

	//user/talkabout
	app.post('/user/talkabout',function(req,res){
		dir.mkdirsSync("comment/pic/"+req.session.user+"/status");//不存在文件夹先创建

		var form = new formidable.IncomingForm();   //创建上传表单
	    form.encoding = 'utf-8';		//设置编辑
	    form.uploadDir = 'comment/pic/'+req.session.user+"/status";	 //设置上传目录
	    form.keepExtensions = true;	 //保留后缀
	    // form.maxFieldsSize = 2 * 1024 * 1024;   //文件大小
	    form.parse(req, function(err, fields, files) {
		    if (err) {
		     	console.log(err)
		      	res.send({stutas:'false'})
				return;
		    }else{
		    	var picarray=[]
		    	for(var i in files){
		    		if(files[i].type){
					    var extName = '';  //后缀名
					    switch (files[i].type) {
					      case 'image/pjpeg':
					        extName = 'jpg';
					        break;
					      case 'image/jpeg':
					        extName = 'jpg';
					        break;		 
					      case 'image/png':
					        extName = 'png';
					        break;
					      case 'image/x-png':
					        extName = 'png';
					        break;
				          case 'image/gif':
					        extName = 'gif';
					        break;			 
					    }
					    if(extName.length == 0){
					    	fs.unlink(files[i].path)
					        res.send = '只支持png和jpg格式图片';
					    }else{
					    	picarray.push(files[i].path.substring(7,files[i].path.length));
						}
					}
				}
				// 发表为状态
				if(!fields.activedate){
					var talkaboutobj={
				    	text:fields.mystatus,
				    	pic:picarray,
				    	createTime:'',
				    	comment:[],
				    	statusID:req.session.user+new Date().getTime(),
				    	zan:[]
				    }
				    var date=new Date;
				    talkaboutobj.createTime=date.getFullYear()+'-'+date.getMonth()+'-'+date.getDate()+'  '+date.getHours()+':'+date.getMinutes()+':'+date.getSeconds();
				    Talkabout.findOne({username:req.session.user},function(err,data){
				    	if(err){
				    		console.log(err);
				    		res.send({stutas:'false'})	
				    		return;
				    	}else{
				    		if(!data){
				    			var talkabout=new Talkabout({
				    				username:req.session.user,
				    				content:[]
				    			})
				    			talkabout.content.push(talkaboutobj);
				    			talkabout.markModified('content');
				    			talkabout.save(function(){
				    				res.redirect('/index')
				    			});
				    		}else{
					    		data.content.push(talkaboutobj);
					    		data.markModified('content');
					    		data.save(function(){
					    			res.redirect('/index')
					    		});
					    	}

				    	}
				    })
				}else{
					//发表为活动
					var date=new Date;
					var activeobj= new Active({
						text:fields.mystatus,
				    	pic:picarray,
				    	createTime:date.getFullYear()+'-'+date.getMonth()+'-'+date.getDate()+'  '+date.getHours()+':'+date.getMinutes()+':'+date.getSeconds(),
				    	comment:[],
				    	zan:[],
				    	join:[req.session.user],
				    	localtion:fields.activelocaltion,
				    	activeTime:fields.activedate,
				    	taps:[fields.activetaps],
				    	title:fields.activeTitle
					})
					activeobj.save();
				}
		  	}
		});
	})
	//获取评论信息
	app.post('/status/getcommit',function(req,res){
		var _statusID=req.body.statusID;
		var _concems=req.body.concems;
		Statuslist.findOne({username:req.session.user},function(err,onestatus){
			for(var i in onestatus.content){
				if(onestatus.content[i].content.statusID==_statusID){
					users=[]
					var t=1;
					var comment=onestatus.content[i].content.comment;
					for(var n in comment){
						User.findOne({username:comment[n].username},function(err,user){
							user.password=undefined;
							users.push(user)
							if(t==comment.length){
								res.send({
									users:users,
									comment:comment
								})
								return false;
							}
							t++;
						})
					}
				}
			}
		})
	})
	//用户评论
	app.post('/status/postcommit',function(req,res){
		var _statusID=req.body.statusID;
		var _text=req.body.text;
		var _concems=req.body.concems;
		var _createTime=req.body.createTime;
		Talkabout.findOne({username:_concems},function(err,talkabout){
			for(var i in talkabout.content){
				if(talkabout.content[i].statusID==_statusID){
					if(!!req.body.zan){
						if(talkabout.content[i].zan.length==0){
							talkabout.content[i].zan.push(req.session.user);
						}else{
							for(var t in talkabout.content[i].zan){
								if(talkabout.content[i].zan[t]==req.session.user){
									res.send({'b':'已经点过赞了'})
									return false;
								}else{
									if(t==talkabout.content[i].zan.length-1){
										talkabout.content[i].zan.push(req.session.user)
									}
								}
							}
						}
					}else{
						var onecommit={
							username:req.session.user,
							text:_text,
							createTime:_createTime
						}
						talkabout.content[i].comment.push(onecommit);
					};
					//mixed类型发生变化必须
					talkabout.markModified('content');
					talkabout.save(function(err,a){
						User.findOne({username:_concems},function(err,user){
							for(var i in user.fans){
								Statuslist.findOne({username:user.fans[i]},function(err,statuslist){
									for(var n in statuslist.content){
										if(statuslist.content[n].content.statusID==_statusID){
											if(onecommit){
												statuslist.content[n].content.comment.push(onecommit);
												
											}else{
												statuslist.content[n].content.zan.push(req.session.user)
											}
											statuslist.markModified('content');
											statuslist.save();
										}
									}
								})
							}
						})
					})
				}
			}
		})
	})

	//page2 news detail
	app.get('/news/:id',function(req,res){
		var _newsid=req.params.id;
		var _id=_newsid.substring(1,_newsid.length-1)
		
		sinadetail.findOne({newsId:_id},function(err,newsdetail){
			if(err){
				console.log(err)
				res.send({stutas:'false'})
				return;
			}else{
				res.send(newsdetail);
			}
		})
		
	})


	//headerpic change
	app.post('/user/headerpic',function(req,res){
		dir.mkdirsSync("comment/pic/"+req.session.user+"/headerpic");//不存在文件夹先创建

		var form = new formidable.IncomingForm();   //创建上传表单
	    form.encoding = 'utf-8';		//设置编辑
	    form.uploadDir = 'comment/pic/'+req.session.user+"/headerpic";	 //设置上传目录
	    form.keepExtensions = true;	 //保留后缀
	    // form.maxFieldsSize = 2 * 1024 * 1024;   //文件大小
	    form.parse(req, function(err, fields, files) {
		    if (err) {
		      console.log(err)
		      res.send({stutas:'false'})
		      return;		
		    }else{
			    var extName = '';  //后缀名
			    switch (files.headerpic.type) {
			      case 'image/pjpeg':
			        extName = 'jpg';
			        break;
			      case 'image/jpeg':
			        extName = 'jpg';
			        break;		 
			      case 'image/png':
			        extName = 'png';
			        break;
			      case 'image/x-png':
			        extName = 'png';
			        break;
		          case 'image/gif':
			        extName = 'gif';
			        break;			 
			    }
			    if(extName.length == 0){
			    	fs.unlink(files.headerpic.path)
			        // res.send = '只支持png和jpg格式图片';
			    }else{
			    	User.findOne({username:req.session.user},function(err,user){
			    		if(err){
			    			console.log(err)
			    			res.send({stutas:'false'})	
			    			return;
			    		}else{
			    			user.headerpic=files.headerpic.path.substring(7,files.headerpic.path.length);
			    			user.save(function(err,nuser){
			    				if(err){
					    			console.log(err)
					    			res.send({stutas:'false'})	
					    			return;
		    					}else{
			    					res.send({a:'a'})
			    				}
			    			})
			    		}
			    	})
				}
			}
		});
	})

	

	//login session
	app.post('/login',function(req,res){
		var _username=req.body.username;
		var _password=req.body.password ? req.body.password : "";
		var _phonenum=req.body.phonenum;
		var _checknum=req.body.checknum ? req.body.checknum :"";
		
		if(req.body.logintype=="checkmsg"){
			User.find({username:_username},function(err,userdetail){
				if(err){
					console.log(err)
					res.send({stutas:'false'})
					return;
				};
				if(!!userdetail.length){
					res.send({loginStatus:'4',msg:"糟糕，用户名被注册了"})
				}else{
					User.find({phonenum:_phonenum},function(err,userdetail){
						if(err){
							console.log(err)
							res.send({stutas:'false'})
							return;
						};
						if(!!userdetail.length){
							res.send({loginStatus:'5',msg:"糟糕，电话被注册了"})
						}else{
							if(req.session.phonenum==_phonenum){
								req.session.checkTime++
								if(req.session.checkTime>4){
									res.send({loginStatus:'0',msg:"请5分钟后再试"});
									res.end();
								}
							}else{
								req.session.phonenum=_phonenum;
								req.session.checkTime=0;
							};
							var checknum=alidayu(_phonenum);
							req.session.checknum=checknum;
							res.send({loginStatus:'1',msg:"已发送验证码"})
						}
					})
				}
			})
		}

		if(req.body.logintype=='login'){
			User.findOne({username:_username},function(err,userdetail){
				if(err){
					console.log(err)
					res.send({stutas:'false'})
					return;
				};
				if(!userdetail){
					res.send({loginStatus:'4',msg:"用户名输入错误"})
				}else{
					if(userdetail.password==_password){
					 	req.session.user=_username;
						res.send({loginStatus:'6',msg:"登陆成功"})
					}else{
						res.send({loginStatus:'7',msg:"密码输入错误"})
					}
				}
			})
		}

		if(req.body.logintype=='register'){
			User.find({username:_username},function(err,userdetail){
				if(err){
					console.log(err)
					res.send({stutas:'false'})
					return;
				};
				if(!!userdetail.length){
					res.send({loginStatus:'4',msg:"糟糕，用户名被注册了"})
				}else{
					User.find({phonenum:_phonenum},function(err,userdetail){
						if(err){
							console.log(err)
							res.send({stutas:'false'})
							return;
						};
						if(!!userdetail.length){
							res.send({loginStatus:'5',msg:"糟糕，电话被注册了"})
						}else{
							if(_checknum==req.session.checknum){
									var user=new User({
										username:_username,
									 	password:_password,
									 	phonenum:_phonenum
									})
									 user.save();//由实例加载save方法
									 req.session.user=_username;
									 res.send({loginStatus:'2',msg:"已成功注册，3s后跳转主页"})
							}else{
								res.send({loginStatus:'3',msg:"验证码输入不正确"})
							}
						}
					})
				}
			})
		}

		if(req.body.logintype=='forgetpassword'){
			User.findOne({username:_username},function(err,userdetail){
				if(err){
					console.log(err)
					res.send({stutas:'false'})
					return;
				};
				if(!userdetail){
					res.send({loginStatus:'4',msg:"用户名没有注册"})
				}else{
					if(userdetail.phonenum==_phonenum){
						var checknum=alidayu(_phonenum);
						req.session.checknum=checknum;
						res.send({loginStatus:'1',msg:"已发送验证码"})
					}else{
						res.send({loginStatus:'8',msg:"手机号码与账号不匹配"})
					}
				}
			})
		}

		if(req.body.logintype=='forgetcheck'){
			User.findOne({username:_username},function(err,userdetail){
				if(err){
					console.log(err)
					res.send({stutas:'false'})
					return;
				};
				if(!userdetail){
					res.send({loginStatus:'4',msg:"用户名没有注册"})
				}else{
					if(userdetail.phonenum==_phonenum){
						if(req.session.checknum=_checknum){
							req.session.user=_username
							res.send({loginStatus:'9',msg:"校验通过"})
						}else{
							res.send({loginStatus:'3',msg:"验证码输入不正确"})
						}
					}else{
						res.send({loginStatus:'8',msg:"手机号码与账号不匹配"})
					}
				}
			})
		}

		if(req.body.logintype=='password'){
			if(req.session.user){
				User.findOne({username:req.session.user},function(err,userdetail){
					userdetail.password=_password;
					userdetail.save(function(err){
						if(err){
							console.log(err),
							res.send({stutas:'false'})				
							return;res.end()
						};
						res.send({loginStatus:'11',msg:"重置成功，3S后跳转首页"})
					});
				})
			}else{
				res.send({loginStatus:'10',msg:"糟糕，发生意外了"})
			}
		}
	})


}
//index
function alidayu(_phonenum){
	var random= Math.floor(Math.random()*10000)+"";

	
	var client = new TopClient({
	    'appkey': '23274823',
	    'appsecret': 'b3954647d6b44bf02b1602d3f3b499d4',
	    'REST_URL': 'http://gw.api.taobao.com/router/rest'
	});
	 
	client.execute('alibaba.aliqin.fc.sms.num.send', {
	    'extend':'123456',
	    'sms_type':'normal',
	    'sms_free_sign_name':'身份验证',
	    'sms_param':'{\"code\":\"'+random+'\",\"product\":\"Alistar\"}',
	    'rec_num':_phonenum,
	    'sms_template_code':'SMS_2625398'
	}, function(error, response) {
	    if (error)
	     console.log(error);
	})
	return random;
}
